export declare enum AuditAction {
    CREATE = "CREATE",
    UPDATE = "UPDATE",
    DELETE = "DELETE",
    GRANT_ACCESS = "GRANT_ACCESS",
    REVOKE_ACCESS = "REVOKE_ACCESS",
    GRANT_ROLE = "GRANT_ROLE",
    REVOKE_ROLE = "REVOKE_ROLE"
}
export declare class AuditEntry {
    docType: string;
    txId: string;
    collection: string;
    key: string;
    action: AuditAction;
    actorId: string;
    resultingVersion: number;
    timestamp: string;
}
//# sourceMappingURL=auditEntry.d.ts.map