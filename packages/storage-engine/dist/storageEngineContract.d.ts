import { Context, Contract } from "fabric-contract-api";
export declare class StorageEngineContract extends Contract {
    constructor();
    private canWrite;
    private canRead;
    private assertCanWrite;
    private assertCanRead;
    private assertValidIdentity;
    private assertValidRole;
    private writeAuditEntry;
    PutRecord(ctx: Context, collection: string, key: string, data: string, expectedVersion: string, aclMode: string): Promise<void>;
    GetRecord(ctx: Context, collection: string, key: string): Promise<string>;
    DeleteRecord(ctx: Context, collection: string, key: string, expectedVersion: string): Promise<void>;
    GetRecordsInCollection(ctx: Context, collection: string, pageSize: string, bookmark: string): Promise<string>;
    GrantAccess(ctx: Context, collection: string, key: string, granteeId: string): Promise<void>;
    RevokeAccess(ctx: Context, collection: string, key: string, granteeId: string): Promise<void>;
    GrantRole(ctx: Context, collection: string, key: string, role: string): Promise<void>;
    RevokeRole(ctx: Context, collection: string, key: string, role: string): Promise<void>;
    GetAuditLog(ctx: Context, collection: string, key: string, pageSize: string, bookmark: string): Promise<string>;
}
//# sourceMappingURL=storageEngineContract.d.ts.map