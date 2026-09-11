import { Request, Response, NextFunction } from 'express';
import { mapFabricError } from '../errors';

export function errorHandler(
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
): void {
    const mapped = mapFabricError(err);
    if (mapped.statusCode === 500) {
        console.error('Unmapped error:', err); // log full detail only for genuine surprises
    }
    res.status(mapped.statusCode).json({ error: mapped.message });
}
