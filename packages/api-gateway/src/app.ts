import express, { Express } from 'express';
import { Contract } from '@hyperledger/fabric-gateway';
import { createApiRouter } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { requireApiKey } from './middleware/auth';

export function createApp(contract: Contract): Express {
    const app = express();

    app.use(express.json());
    app.use(requireApiKey)
    app.use(createApiRouter(contract));
    app.use(errorHandler);

    return app;
}
