export declare enum AclMode {
    WRITE_ONLY = "WRITE_ONLY",
    READ_WRITE = "READ_WRITE"
}
export declare class StorageRecord {
    docType: string;
    collection: string;
    key: string;
    ownerId: string;
    acl: string[];
    allowedRoles: string[];
    aclMode: AclMode;
    data: string;
    deleted: boolean;
    version: number;
    createdAt: string;
    updatedAt: string;
}
//# sourceMappingURL=record.d.ts.map