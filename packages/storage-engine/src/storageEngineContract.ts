import {
  Context,
  Contract,
  Info,
  Returns,
  Transaction,
} from "fabric-contract-api";
import { AclMode, StorageRecord } from "./record";
import { makeAuditKey, makeRecordKey } from "./key";
import stringify from "json-stringify-deterministic";
import sortKeysRecursive from "sort-keys-recursive";
import { AuditAction, AuditEntry } from "./auditEntry";

@Info({
  title: "StorageEngineContract",
  description: "AmanaDB zero-trust storage engine",
})
export class StorageEngineContract extends Contract {
  constructor() {
    super("org.amanadb.storage");
  }

  private canWrite(ctx: Context, record: StorageRecord): boolean {
    const callerId = ctx.clientIdentity.getID();
    if (callerId === record.ownerId || record.acl.includes(callerId)) {
      return true;
    }

    const role = ctx.clientIdentity.getAttributeValue("role");
    if (role && record.allowedRoles.includes(role)) {
      return true;
    }

    return false;
  }

  private canRead(ctx: Context, record: StorageRecord): boolean {
    if (record.aclMode === AclMode.WRITE_ONLY) {
      return true;
    }
    return this.canWrite(ctx, record);
  }

  private assertCanWrite(ctx: Context, record: StorageRecord): void {
    if (!this.canWrite(ctx, record)) {
      throw new Error(
        "Submitting identity is not authorized to write this record",
      );
    }
  }

  private assertCanRead(ctx: Context, record: StorageRecord): void {
    if (!this.canRead(ctx, record)) {
      throw new Error(
        "Submitting identity is not authorized to read this record",
      );
    }
  }

  private assertValidIdentity(granteeId: string): void {
    if (!granteeId || typeof granteeId !== "string") {
      throw new Error("granteeId is required");
    }
    // Fabric client identities always take the form
    // x509::<subject DN>::<issuer DN> — reject anything that
    // doesn't at least match that basic shape.
    const parts = granteeId.split("::");
    if (parts.length !== 3 || parts[0] !== "x509" || !parts[1] || !parts[2]) {
      throw new Error(
        `granteeId does not look like a valid identity: ${granteeId}`,
      );
    }
  }

  private assertValidRole(role: string): void {
    if (!role || typeof role !== "string" || role.trim().length === 0) {
      throw new Error("role is required");
    }
  }

  private async writeAuditEntry(
    ctx: Context,
    collection: string,
    key: string,
    action: AuditAction,
    resultingVersion: number,
  ): Promise<void> {
    const now = ctx.stub.getTxTimestamp();
    const entry: AuditEntry = {
      docType: "audit",
      txId: ctx.stub.getTxID(),
      collection,
      key,
      action,
      actorId: ctx.clientIdentity.getID(),
      resultingVersion,
      timestamp: new Date(now.seconds.low * 1000).toISOString(),
    };

    const auditKey = makeAuditKey(
      ctx.stub,
      collection,
      key,
      ctx.stub.getTxID(),
    );
    await ctx.stub.putState(
      auditKey,
      Buffer.from(stringify(sortKeysRecursive(entry))),
    );
  }

  @Transaction()
  public async PutRecord(
    ctx: Context,
    collection: string,
    key: string,
    data: string,
    expectedVersion: string,
    aclMode: string,
  ): Promise<void> {
    const compositeKey = makeRecordKey(ctx.stub, collection, key);
    const callerId = ctx.clientIdentity.getID();
    const existingBytes = await ctx.stub.getState(compositeKey);
    const now = ctx.stub.getTxTimestamp();
    const timestamp = new Date(now.seconds.low * 1000).toISOString();
    
    const existing: StorageRecord | null = existingBytes && existingBytes.length > 0 ? JSON.parse(existingBytes.toString()) : null;

    try {
      JSON.parse(data);
    } catch (err) {
      throw new Error("data must be valid JSON");
    }

    if (!existing || existing.deleted) {
      if (expectedVersion !== "0") {
        throw new Error(
          'expectedVersion must be "0" when creating a new record',
        );
      }
      if (!Object.values(AclMode).includes(aclMode as AclMode)) {
        throw new Error(`Invalid aclMode: ${aclMode}`);
      }
      const nextVersion = existing ? existing.version + 1 : 1
      const record: StorageRecord = {
        docType: "record",
        collection,
        key,
        ownerId: callerId,
        acl: [],
        allowedRoles: [],
        aclMode: aclMode as AclMode,
        deleted: false,
        data,
        version: nextVersion,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      await ctx.stub.putState(
        compositeKey,
        Buffer.from(stringify(sortKeysRecursive(record))),
      );
      await this.writeAuditEntry(ctx, collection, key, AuditAction.CREATE, 1);
      return;
    }


    this.assertCanWrite(ctx, existing);

    const expected = Number(expectedVersion);
    if (Number.isNaN(expected) || expected !== existing.version) {
      throw new Error(
        `Version conflict: expected ${expected}, but current version is ${existing.version}`,
      );
    }

    const updated: StorageRecord = {
      ...existing,
      data,
      version: existing.version + 1,
      updatedAt: timestamp,
    };

    await ctx.stub.putState(
      compositeKey,
      Buffer.from(stringify(sortKeysRecursive(updated))),
    );

    await this.writeAuditEntry(
      ctx,
      collection,
      key,
      AuditAction.UPDATE,
      updated.version,
    );
  }

  @Transaction(false)
  @Returns("string")
  public async GetRecord(
    ctx: Context,
    collection: string,
    key: string,
  ): Promise<string> {
    const compositeKey = makeRecordKey(ctx.stub, collection, key);
    const bytes = await ctx.stub.getState(compositeKey);

    if (!bytes || bytes.length === 0) {
      throw new Error(`Record ${collection}/${key} does not exist`);
    }

    const record: StorageRecord = JSON.parse(bytes.toString());
    if (record.deleted) {
      throw new Error(`Record ${collection}/${key} does not exist`);
    }

    const callerId = ctx.clientIdentity.getID();
    this.assertCanRead(ctx, record);

    return bytes.toString();
  }

  @Transaction()
  public async DeleteRecord(
    ctx: Context,
    collection: string,
    key: string,
    expectedVersion: string,
  ): Promise<void> {
    const compositeKey = makeRecordKey(ctx.stub, collection, key);
    const bytes = await ctx.stub.getState(compositeKey);
    if (!bytes || bytes.length === 0) {
      throw new Error(`Record not found or User not authorized`);
    }

    const existing: StorageRecord = JSON.parse(bytes.toString());
    if (existing.deleted) {
      throw new Error(`Record not found or User not authorized`);
    }

    const callerId = ctx.clientIdentity.getID();
    this.assertCanWrite(ctx, existing);

    const expected = Number(expectedVersion);
    if (Number.isNaN(expected) || expected !== existing.version) {
      throw new Error(
        `Version conflict: expected ${expected}, but current version is ${existing.version}`,
      );
    }

    const now = ctx.stub.getTxTimestamp();
    const deleted: StorageRecord = {
      ...existing,
      deleted: true,
      version: existing.version + 1,
      updatedAt: new Date(now.seconds.low * 1000).toISOString(),
    };

    await ctx.stub.putState(
      compositeKey,
      Buffer.from(stringify(sortKeysRecursive(deleted))),
    );
    await this.writeAuditEntry(
      ctx,
      collection,
      key,
      AuditAction.DELETE,
      deleted.version,
    );
  }

  @Transaction(false)
  @Returns("string")
  public async GetRecordsInCollection(
    ctx: Context,
    collection: string,
    pageSize: string,
    bookmark: string,
  ): Promise<string> {
    const callerId = ctx.clientIdentity.getID();
    const results: StorageRecord[] = [];

    const size = Number(pageSize);
    if (Number.isNaN(size) || size <= 0) {
      throw new Error("pageSize must be a positive number");
    }

    const { iterator, metadata } =
      await ctx.stub.getStateByPartialCompositeKeyWithPagination(
        "record",
        [collection],
        size,
        bookmark,
      );

    let result = await iterator.next();
    while (!result.done) {
      const strValue = Buffer.from(result.value.value.toString()).toString(
        "utf8",
      );
      const record: StorageRecord = JSON.parse(strValue);

      if (record.deleted) {
        result = await iterator.next();
        continue;
      }

      if (this.canRead(ctx, record)) {
        results.push(record);
      }

      result = await iterator.next();
    }
    await iterator.close();

    return JSON.stringify({
      records: results,
      bookmark: metadata.bookmark,
      fetchedRecordsCount: metadata.fetchedRecordsCount,
    });
  }

  @Transaction()
  public async GrantAccess(
    ctx: Context,
    collection: string,
    key: string,
    granteeId: string,
  ): Promise<void> {
    const compositeKey = makeRecordKey(ctx.stub, collection, key);
    const bytes = await ctx.stub.getState(compositeKey);
    if (!bytes || bytes.length === 0) {
      throw new Error(`Record not found or not authorized`);
    }

    const record: StorageRecord = JSON.parse(bytes.toString());
    const callerId = ctx.clientIdentity.getID();

    if (callerId !== record.ownerId) {
      throw new Error("Only the record owner can grant access");
    }

    this.assertValidIdentity(granteeId);

    if (granteeId === record.ownerId) {
      throw new Error(
        "Cannot grant access to the record owner — the owner already has full access",
      );
    }

    if (record.acl.includes(granteeId)) {
      return;
    }

    record.acl.push(granteeId);
    await ctx.stub.putState(
      compositeKey,
      Buffer.from(stringify(sortKeysRecursive(record))),
    );
    await this.writeAuditEntry(
      ctx,
      collection,
      key,
      AuditAction.GRANT_ACCESS,
      record.version,
    );
  }

  @Transaction()
  public async RevokeAccess(
    ctx: Context,
    collection: string,
    key: string,
    granteeId: string,
  ): Promise<void> {
    const compositeKey = makeRecordKey(ctx.stub, collection, key);
    const bytes = await ctx.stub.getState(compositeKey);
    if (!bytes || bytes.length === 0) {
      throw new Error(`Record not found or User not authorized`);
    }

    const record: StorageRecord = JSON.parse(bytes.toString());
    const callerId = ctx.clientIdentity.getID();

    if (callerId !== record.ownerId) {
      throw new Error("Only the record owner can revoke access");
    }

    this.assertValidIdentity(granteeId);

    const index = record.acl.indexOf(granteeId);
    if (index === -1) {
      return;
    }

    record.acl.splice(index, 1);
    await ctx.stub.putState(
      compositeKey,
      Buffer.from(stringify(sortKeysRecursive(record))),
    );
    await this.writeAuditEntry(
      ctx,
      collection,
      key,
      AuditAction.REVOKE_ACCESS,
      record.version,
    );
  }

  @Transaction()
  public async GrantRole(
    ctx: Context,
    collection: string,
    key: string,
    role: string,
  ): Promise<void> {
    const compositeKey = makeRecordKey(ctx.stub, collection, key);
    const bytes = await ctx.stub.getState(compositeKey);
    if (!bytes || bytes.length === 0) {
      throw new Error(`Record not found or User not authorized`);
    }

    const record: StorageRecord = JSON.parse(bytes.toString());
    const callerId = ctx.clientIdentity.getID();

    if (callerId !== record.ownerId) {
      throw new Error("Only the record owner can grant a role");
    }

    this.assertValidRole(role);

    if (record.allowedRoles.includes(role)) {
      return;
    }

    record.allowedRoles.push(role);
    await ctx.stub.putState(
      compositeKey,
      Buffer.from(stringify(sortKeysRecursive(record))),
    );
    await this.writeAuditEntry(
      ctx,
      collection,
      key,
      AuditAction.GRANT_ROLE,
      record.version,
    );
  }

  @Transaction()
  public async RevokeRole(
    ctx: Context,
    collection: string,
    key: string,
    role: string,
  ): Promise<void> {
    const compositeKey = makeRecordKey(ctx.stub, collection, key);
    const bytes = await ctx.stub.getState(compositeKey);
    if (!bytes || bytes.length === 0) {
      throw new Error(`Record not found or User not authorized`);
    }

    const record: StorageRecord = JSON.parse(bytes.toString());
    const callerId = ctx.clientIdentity.getID();

    if (callerId !== record.ownerId) {
      throw new Error("Only the record owner can revoke a role");
    }

    const index = record.allowedRoles.indexOf(role);
    if (index === -1) {
      return;
    }

    record.allowedRoles.splice(index, 1);
    await ctx.stub.putState(
      compositeKey,
      Buffer.from(stringify(sortKeysRecursive(record))),
    );
    await this.writeAuditEntry(
      ctx,
      collection,
      key,
      AuditAction.REVOKE_ROLE,
      record.version,
    );
  }

  @Transaction(false)
  @Returns("string")
  public async GetAuditLog(
    ctx: Context,
    collection: string,
    key: string,
    pageSize: string,
    bookmark: string,
  ): Promise<string> {
    const compositeKey = makeRecordKey(ctx.stub, collection, key);
    const bytes = await ctx.stub.getState(compositeKey);
    if (!bytes || bytes.length === 0) {
      throw new Error(`Record not found or User not authorized`);
    }

    const record: StorageRecord = JSON.parse(bytes.toString());
    const callerId = ctx.clientIdentity.getID();

    if (callerId !== record.ownerId) {
      throw new Error("Only the record owner can view its audit log");
    }

    const size = Number(pageSize);
    if (Number.isNaN(size) || size <= 0) {
      throw new Error("pageSize must be a positive number");
    }

    const { iterator, metadata } =
      await ctx.stub.getStateByPartialCompositeKeyWithPagination(
        "audit",
        [collection, key],
        size,
        bookmark,
      );

    const results: AuditEntry[] = [];
    let result = await iterator.next();
    while (!result.done) {
      const strValue = Buffer.from(result.value.value.toString()).toString(
        "utf8",
      );
      results.push(JSON.parse(strValue));
      result = await iterator.next();
    }
    await iterator.close();

    return JSON.stringify({
      entries: results,
      bookmark: metadata.bookmark,
      fetchedRecordsCount: metadata.fetchedRecordsCount,
    });
  }
}
