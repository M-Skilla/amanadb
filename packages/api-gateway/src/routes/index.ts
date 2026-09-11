import { Router } from 'express';
import { Contract } from '@hyperledger/fabric-gateway';
import { createRecordRouter } from './recordRoutes';

export function createApiRouter(contract: Contract): Router {
    const router = Router();
    router.use('/collections', createRecordRouter(contract));
    return router;
}
