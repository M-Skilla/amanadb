import { Contract } from '@hyperledger/fabric-gateway';
import { NotFoundError, VersionConflictError, mapFabricError } from '../errors';

const MAX_RETRIES = 3;

function parseJson(bytes: Uint8Array): unknown {
    return JSON.parse(Buffer.from(bytes).toString('utf8'));
}

async function getCurrentVersion(contract: Contract, collection: string, key: string): Promise<number | null> {
    try {
        const bytes = await contract.evaluateTransaction('GetRecord', collection, key);
        const record = parseJson(bytes) as { version: number };
        return record.version;
    } catch (err) {
        const mapped = mapFabricError(err);
        if (mapped instanceof NotFoundError) return null;
        throw mapped;
    }
}

export async function getRecord(contract: Contract, collection: string, key: string): Promise<unknown> {
    return parseJson(await contract.evaluateTransaction('GetRecord', collection, key));
}

export async function listRecords(
    contract: Contract,
    collection: string,
    pageSize: string,
    bookmark: string,
): Promise<unknown> {
    return parseJson(
        await contract.evaluateTransaction('GetRecordsInCollection', collection, pageSize, bookmark),
    );
}

export async function getAuditLog(
    contract: Contract,
    collection: string,
    key: string,
    pageSize: string,
    bookmark: string,
): Promise<unknown> {
    return parseJson(
        await contract.evaluateTransaction('GetAuditLog', collection, key, pageSize, bookmark),
    );
}

export async function putRecord(
    contract: Contract,
    collection: string,
    key: string,
    data: unknown,
    aclMode: string,
): Promise<void> {
    const dataJson = JSON.stringify(data);

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const currentVersion = await getCurrentVersion(contract, collection, key);
        const expectedVersion = currentVersion === null ? '0' : String(currentVersion);

        try {
            await contract.submitTransaction('PutRecord', collection, key, dataJson, expectedVersion, aclMode);
            return;
        } catch (err) {
            const mapped = mapFabricError(err);
            if (mapped instanceof VersionConflictError && attempt < MAX_RETRIES - 1) {
                continue; // re-fetch the now-current version and retry
            }
            throw mapped;
        }
    }
}

export async function deleteRecord(contract: Contract, collection: string, key: string): Promise<void> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const currentVersion = await getCurrentVersion(contract, collection, key);
        if (currentVersion === null) {
            throw new NotFoundError(`Record ${collection}/${key} does not exist`);
        }
        try {
            await contract.submitTransaction('DeleteRecord', collection, key, String(currentVersion));
            return;
        } catch (err) {
            const mapped = mapFabricError(err);
            if (mapped instanceof VersionConflictError && attempt < MAX_RETRIES - 1) {
                continue;
            }
            throw mapped;
        }
    }
}
