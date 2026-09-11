import { RequestHandler } from 'express';
import { Contract } from '@hyperledger/fabric-gateway';
import { ValidationError } from '../errors';
import * as recordService from '../services/recordService';
import * as accessService from '../services/accessService';

export interface RecordController {
    getRecord: RequestHandler;
    listRecords: RequestHandler;
    getAuditLog: RequestHandler;
    putRecord: RequestHandler;
    deleteRecord: RequestHandler;
    grantAccess: RequestHandler;
    revokeAccess: RequestHandler;
    grantRole: RequestHandler;
    revokeRole: RequestHandler;
}

export function createRecordController(contract: Contract): RecordController {
    return {
        getRecord: async (req, res, next) => {
            try {
                const { collection, key } = req.params;
                const record = await recordService.getRecord(contract, collection as string, key as string);
                res.json(record);
            } catch (err) {
                next(err);
            }
        },

        listRecords: async (req, res, next) => {
            try {
                const { collection } = req.params;
                const pageSize = (req.query.pageSize as string) ?? '20';
                const bookmark = (req.query.bookmark as string) ?? '';
                const records = await recordService.listRecords(
                    contract,
                    collection as string,
                    pageSize,
                    bookmark,
                );
                res.json(records);
            } catch (err) {
                next(err);
            }
        },

        getAuditLog: async (req, res, next) => {
            try {
                const { collection, key } = req.params;
                const pageSize = (req.query.pageSize as string) ?? '20';
                const bookmark = (req.query.bookmark as string) ?? '';
                const log = await recordService.getAuditLog(
                    contract,
                    collection as string,
                    key as string,
                    pageSize,
                    bookmark,
                );
                res.json(log);
            } catch (err) {
                next(err);
            }
        },

        putRecord: async (req, res, next) => {
            try {
                const { collection, key } = req.params;
                const { data, aclMode } = req.body;
                if (data === undefined) throw new ValidationError('data is required');
                await recordService.putRecord(
                    contract,
                    collection as string,
                    key as string,
                    data,
                    aclMode ?? 'WRITE_ONLY',
                );
                res.status(204).send();
            } catch (err) {
                next(err);
            }
        },

        deleteRecord: async (req, res, next) => {
            try {
                const { collection, key } = req.params;
                await recordService.deleteRecord(contract, collection as string, key as string);
                res.status(204).send();
            } catch (err) {
                next(err);
            }
        },

        grantAccess: async (req, res, next) => {
            try {
                const { collection, key } = req.params;
                const { granteeId } = req.body;
                if (!granteeId) throw new ValidationError('granteeId is required');
                await accessService.grantAccess(contract, collection as string, key as string, granteeId);
                res.status(204).send();
            } catch (err) {
                next(err);
            }
        },

        revokeAccess: async (req, res, next) => {
            try {
                const { collection, key, granteeId } = req.params;
                await accessService.revokeAccess(
                    contract,
                    collection as string,
                    key as string,
                    granteeId as string,
                );
                res.status(204).send();
            } catch (err) {
                next(err);
            }
        },

        grantRole: async (req, res, next) => {
            try {
                const { collection, key } = req.params;
                const { role } = req.body;
                if (!role) throw new ValidationError('role is required');
                await accessService.grantRole(contract, collection as string, key as string, role);
                res.status(204).send();
            } catch (err) {
                next(err);
            }
        },

        revokeRole: async (req, res, next) => {
            try {
                const { collection, key, role } = req.params;
                await accessService.revokeRole(contract, collection as string, key as string, role as string);
                res.status(204).send();
            } catch (err) {
                next(err);
            }
        },
    };
}
