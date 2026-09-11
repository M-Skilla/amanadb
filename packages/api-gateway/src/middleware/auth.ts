import { Request, Response, NextFunction } from 'express';
import { verifyApiKey, ApiKeyRole } from '../apiKeys/store';

declare global {
    namespace Express {
        interface Request {
            apiKey?: { name: string; role: ApiKeyRole };
        }
    }
}

export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
    const header = req.header('Authorization');
    const rawKey = header?.startsWith('Bearer ') ? header.slice(7) : null;

    if (!rawKey) {
        res.status(401).json({ error: 'Missing or malformed Authorization header' });
        return;
    }

    const matched = verifyApiKey(rawKey);
    if (!matched) {
        res.status(401).json({ error: 'Invalid API key' });
        return;
    }

    req.apiKey = matched;
    next();
}

export function requireRole(role: ApiKeyRole) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (req.apiKey?.role !== role) {
            res.status(403).json({ error: `This operation requires the '${role}' role` });
            return;
        }
        next();
    };
}