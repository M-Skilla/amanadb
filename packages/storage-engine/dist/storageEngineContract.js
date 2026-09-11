"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageEngineContract = void 0;
const fabric_contract_api_1 = require("fabric-contract-api");
const record_1 = require("./record");
const key_1 = require("./key");
const json_stringify_deterministic_1 = __importDefault(require("json-stringify-deterministic"));
const sort_keys_recursive_1 = __importDefault(require("sort-keys-recursive"));
const auditEntry_1 = require("./auditEntry");
let StorageEngineContract = class StorageEngineContract extends fabric_contract_api_1.Contract {
    constructor() {
        super("org.amanadb.storage");
    }
    canWrite(ctx, record) {
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
    canRead(ctx, record) {
        if (record.aclMode === record_1.AclMode.WRITE_ONLY) {
            return true;
        }
        return this.canWrite(ctx, record);
    }
    assertCanWrite(ctx, record) {
        if (!this.canWrite(ctx, record)) {
            throw new Error("Submitting identity is not authorized to write this record");
        }
    }
    assertCanRead(ctx, record) {
        if (!this.canRead(ctx, record)) {
            throw new Error("Submitting identity is not authorized to read this record");
        }
    }
    assertValidIdentity(granteeId) {
        if (!granteeId || typeof granteeId !== "string") {
            throw new Error("granteeId is required");
        }
        // Fabric client identities always take the form
        // x509::<subject DN>::<issuer DN> — reject anything that
        // doesn't at least match that basic shape.
        const parts = granteeId.split("::");
        if (parts.length !== 3 || parts[0] !== "x509" || !parts[1] || !parts[2]) {
            throw new Error(`granteeId does not look like a valid identity: ${granteeId}`);
        }
    }
    assertValidRole(role) {
        if (!role || typeof role !== "string" || role.trim().length === 0) {
            throw new Error("role is required");
        }
    }
    async writeAuditEntry(ctx, collection, key, action, resultingVersion) {
        const now = ctx.stub.getTxTimestamp();
        const entry = {
            docType: "audit",
            txId: ctx.stub.getTxID(),
            collection,
            key,
            action,
            actorId: ctx.clientIdentity.getID(),
            resultingVersion,
            timestamp: new Date(now.seconds.low * 1000).toISOString(),
        };
        const auditKey = (0, key_1.makeAuditKey)(ctx.stub, collection, key, ctx.stub.getTxID());
        await ctx.stub.putState(auditKey, Buffer.from((0, json_stringify_deterministic_1.default)((0, sort_keys_recursive_1.default)(entry))));
    }
    async PutRecord(ctx, collection, key, data, expectedVersion, aclMode) {
        const compositeKey = (0, key_1.makeRecordKey)(ctx.stub, collection, key);
        const callerId = ctx.clientIdentity.getID();
        const existingBytes = await ctx.stub.getState(compositeKey);
        const now = ctx.stub.getTxTimestamp();
        const timestamp = new Date(now.seconds.low * 1000).toISOString();
        const existing = existingBytes && existingBytes.length > 0 ? JSON.parse(existingBytes.toString()) : null;
        try {
            JSON.parse(data);
        }
        catch (err) {
            throw new Error("data must be valid JSON");
        }
        if (!existing || existing.deleted) {
            if (expectedVersion !== "0") {
                throw new Error('expectedVersion must be "0" when creating a new record');
            }
            if (!Object.values(record_1.AclMode).includes(aclMode)) {
                throw new Error(`Invalid aclMode: ${aclMode}`);
            }
            const nextVersion = existing ? existing.version + 1 : 1;
            const record = {
                docType: "record",
                collection,
                key,
                ownerId: callerId,
                acl: [],
                allowedRoles: [],
                aclMode: aclMode,
                deleted: false,
                data,
                version: nextVersion,
                createdAt: timestamp,
                updatedAt: timestamp,
            };
            await ctx.stub.putState(compositeKey, Buffer.from((0, json_stringify_deterministic_1.default)((0, sort_keys_recursive_1.default)(record))));
            await this.writeAuditEntry(ctx, collection, key, auditEntry_1.AuditAction.CREATE, 1);
            return;
        }
        this.assertCanWrite(ctx, existing);
        const expected = Number(expectedVersion);
        if (Number.isNaN(expected) || expected !== existing.version) {
            throw new Error(`Version conflict: expected ${expected}, but current version is ${existing.version}`);
        }
        const updated = {
            ...existing,
            data,
            version: existing.version + 1,
            updatedAt: timestamp,
        };
        await ctx.stub.putState(compositeKey, Buffer.from((0, json_stringify_deterministic_1.default)((0, sort_keys_recursive_1.default)(updated))));
        await this.writeAuditEntry(ctx, collection, key, auditEntry_1.AuditAction.UPDATE, updated.version);
    }
    async GetRecord(ctx, collection, key) {
        const compositeKey = (0, key_1.makeRecordKey)(ctx.stub, collection, key);
        const bytes = await ctx.stub.getState(compositeKey);
        if (!bytes || bytes.length === 0) {
            throw new Error(`Record ${collection}/${key} does not exist`);
        }
        const record = JSON.parse(bytes.toString());
        if (record.deleted) {
            throw new Error(`Record ${collection}/${key} does not exist`);
        }
        const callerId = ctx.clientIdentity.getID();
        this.assertCanRead(ctx, record);
        return bytes.toString();
    }
    async DeleteRecord(ctx, collection, key, expectedVersion) {
        const compositeKey = (0, key_1.makeRecordKey)(ctx.stub, collection, key);
        const bytes = await ctx.stub.getState(compositeKey);
        if (!bytes || bytes.length === 0) {
            throw new Error(`Record not found or User not authorized`);
        }
        const existing = JSON.parse(bytes.toString());
        if (existing.deleted) {
            throw new Error(`Record not found or User not authorized`);
        }
        const callerId = ctx.clientIdentity.getID();
        this.assertCanWrite(ctx, existing);
        const expected = Number(expectedVersion);
        if (Number.isNaN(expected) || expected !== existing.version) {
            throw new Error(`Version conflict: expected ${expected}, but current version is ${existing.version}`);
        }
        const now = ctx.stub.getTxTimestamp();
        const deleted = {
            ...existing,
            deleted: true,
            version: existing.version + 1,
            updatedAt: new Date(now.seconds.low * 1000).toISOString(),
        };
        await ctx.stub.putState(compositeKey, Buffer.from((0, json_stringify_deterministic_1.default)((0, sort_keys_recursive_1.default)(deleted))));
        await this.writeAuditEntry(ctx, collection, key, auditEntry_1.AuditAction.DELETE, deleted.version);
    }
    async GetRecordsInCollection(ctx, collection, pageSize, bookmark) {
        const callerId = ctx.clientIdentity.getID();
        const results = [];
        const size = Number(pageSize);
        if (Number.isNaN(size) || size <= 0) {
            throw new Error("pageSize must be a positive number");
        }
        const { iterator, metadata } = await ctx.stub.getStateByPartialCompositeKeyWithPagination("record", [collection], size, bookmark);
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString("utf8");
            const record = JSON.parse(strValue);
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
    async GrantAccess(ctx, collection, key, granteeId) {
        const compositeKey = (0, key_1.makeRecordKey)(ctx.stub, collection, key);
        const bytes = await ctx.stub.getState(compositeKey);
        if (!bytes || bytes.length === 0) {
            throw new Error(`Record not found or not authorized`);
        }
        const record = JSON.parse(bytes.toString());
        const callerId = ctx.clientIdentity.getID();
        if (callerId !== record.ownerId) {
            throw new Error("Only the record owner can grant access");
        }
        this.assertValidIdentity(granteeId);
        if (granteeId === record.ownerId) {
            throw new Error("Cannot grant access to the record owner — the owner already has full access");
        }
        if (record.acl.includes(granteeId)) {
            return;
        }
        record.acl.push(granteeId);
        await ctx.stub.putState(compositeKey, Buffer.from((0, json_stringify_deterministic_1.default)((0, sort_keys_recursive_1.default)(record))));
        await this.writeAuditEntry(ctx, collection, key, auditEntry_1.AuditAction.GRANT_ACCESS, record.version);
    }
    async RevokeAccess(ctx, collection, key, granteeId) {
        const compositeKey = (0, key_1.makeRecordKey)(ctx.stub, collection, key);
        const bytes = await ctx.stub.getState(compositeKey);
        if (!bytes || bytes.length === 0) {
            throw new Error(`Record not found or User not authorized`);
        }
        const record = JSON.parse(bytes.toString());
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
        await ctx.stub.putState(compositeKey, Buffer.from((0, json_stringify_deterministic_1.default)((0, sort_keys_recursive_1.default)(record))));
        await this.writeAuditEntry(ctx, collection, key, auditEntry_1.AuditAction.REVOKE_ACCESS, record.version);
    }
    async GrantRole(ctx, collection, key, role) {
        const compositeKey = (0, key_1.makeRecordKey)(ctx.stub, collection, key);
        const bytes = await ctx.stub.getState(compositeKey);
        if (!bytes || bytes.length === 0) {
            throw new Error(`Record not found or User not authorized`);
        }
        const record = JSON.parse(bytes.toString());
        const callerId = ctx.clientIdentity.getID();
        if (callerId !== record.ownerId) {
            throw new Error("Only the record owner can grant a role");
        }
        this.assertValidRole(role);
        if (record.allowedRoles.includes(role)) {
            return;
        }
        record.allowedRoles.push(role);
        await ctx.stub.putState(compositeKey, Buffer.from((0, json_stringify_deterministic_1.default)((0, sort_keys_recursive_1.default)(record))));
        await this.writeAuditEntry(ctx, collection, key, auditEntry_1.AuditAction.GRANT_ROLE, record.version);
    }
    async RevokeRole(ctx, collection, key, role) {
        const compositeKey = (0, key_1.makeRecordKey)(ctx.stub, collection, key);
        const bytes = await ctx.stub.getState(compositeKey);
        if (!bytes || bytes.length === 0) {
            throw new Error(`Record not found or User not authorized`);
        }
        const record = JSON.parse(bytes.toString());
        const callerId = ctx.clientIdentity.getID();
        if (callerId !== record.ownerId) {
            throw new Error("Only the record owner can revoke a role");
        }
        const index = record.allowedRoles.indexOf(role);
        if (index === -1) {
            return;
        }
        record.allowedRoles.splice(index, 1);
        await ctx.stub.putState(compositeKey, Buffer.from((0, json_stringify_deterministic_1.default)((0, sort_keys_recursive_1.default)(record))));
        await this.writeAuditEntry(ctx, collection, key, auditEntry_1.AuditAction.REVOKE_ROLE, record.version);
    }
    async GetAuditLog(ctx, collection, key, pageSize, bookmark) {
        const compositeKey = (0, key_1.makeRecordKey)(ctx.stub, collection, key);
        const bytes = await ctx.stub.getState(compositeKey);
        if (!bytes || bytes.length === 0) {
            throw new Error(`Record not found or User not authorized`);
        }
        const record = JSON.parse(bytes.toString());
        const callerId = ctx.clientIdentity.getID();
        if (callerId !== record.ownerId) {
            throw new Error("Only the record owner can view its audit log");
        }
        const size = Number(pageSize);
        if (Number.isNaN(size) || size <= 0) {
            throw new Error("pageSize must be a positive number");
        }
        const { iterator, metadata } = await ctx.stub.getStateByPartialCompositeKeyWithPagination("audit", [collection, key], size, bookmark);
        const results = [];
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString("utf8");
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
};
exports.StorageEngineContract = StorageEngineContract;
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], StorageEngineContract.prototype, "PutRecord", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(false),
    (0, fabric_contract_api_1.Returns)("string"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String, String]),
    __metadata("design:returntype", Promise)
], StorageEngineContract.prototype, "GetRecord", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String, String, String]),
    __metadata("design:returntype", Promise)
], StorageEngineContract.prototype, "DeleteRecord", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(false),
    (0, fabric_contract_api_1.Returns)("string"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String, String, String]),
    __metadata("design:returntype", Promise)
], StorageEngineContract.prototype, "GetRecordsInCollection", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String, String, String]),
    __metadata("design:returntype", Promise)
], StorageEngineContract.prototype, "GrantAccess", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String, String, String]),
    __metadata("design:returntype", Promise)
], StorageEngineContract.prototype, "RevokeAccess", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String, String, String]),
    __metadata("design:returntype", Promise)
], StorageEngineContract.prototype, "GrantRole", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String, String, String]),
    __metadata("design:returntype", Promise)
], StorageEngineContract.prototype, "RevokeRole", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(false),
    (0, fabric_contract_api_1.Returns)("string"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String, String, String, String]),
    __metadata("design:returntype", Promise)
], StorageEngineContract.prototype, "GetAuditLog", null);
exports.StorageEngineContract = StorageEngineContract = __decorate([
    (0, fabric_contract_api_1.Info)({
        title: "StorageEngineContract",
        description: "AmanaDB zero-trust storage engine",
    }),
    __metadata("design:paramtypes", [])
], StorageEngineContract);
//# sourceMappingURL=storageEngineContract.js.map