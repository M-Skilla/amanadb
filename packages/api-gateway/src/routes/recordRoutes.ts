import { Router } from 'express';
import { Contract } from '@hyperledger/fabric-gateway';
import { createRecordController } from '../controllers/recordController';
import { requireRole } from '../middleware/auth';

export function createRecordRouter(contract: Contract): Router {
    const router = Router();
    const controller = createRecordController(contract);

    router.get('/:collection/records/:key', controller.getRecord);
    router.get('/:collection', controller.listRecords);
    router.get('/:collection/records/:key/audit-log', controller.getAuditLog);

    router.put('/:collection/records/:key', controller.putRecord);
    router.delete('/:collection/records/:key', controller.deleteRecord);

    router.post('/:collection/records/:key/access', requireRole('admin'), controller.grantAccess);
    router.delete('/:collection/records/:key/access/:granteeId', requireRole('admin'), controller.revokeAccess);

    router.post('/:collection/records/:key/roles', requireRole('admin'), controller.grantRole);
    router.delete('/:collection/records/:key/roles/:role', requireRole('admin'), controller.revokeRole);

    return router;
}
