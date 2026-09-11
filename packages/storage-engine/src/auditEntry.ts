import { Object as DataObject, Property } from 'fabric-contract-api';

export enum AuditAction {
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
    GRANT_ACCESS = 'GRANT_ACCESS',
    REVOKE_ACCESS = 'REVOKE_ACCESS',
    GRANT_ROLE = 'GRANT_ROLE',
    REVOKE_ROLE = 'REVOKE_ROLE',
}

@DataObject()
export class AuditEntry {

    @Property()
    public docType: string = 'audit';

    @Property()
    public txId: string = '';

    @Property()
    public collection: string = '';

    @Property()
    public key: string = '';

    @Property('action', 'string')
    public action: AuditAction = AuditAction.CREATE;

    @Property()
    public actorId: string = '';

    @Property()
    public resultingVersion: number = 0;

    @Property()
    public timestamp: string = '';
}