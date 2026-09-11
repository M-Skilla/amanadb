import { Contract } from '@hyperledger/fabric-gateway';

export async function grantAccess(
    contract: Contract,
    collection: string,
    key: string,
    granteeId: string,
): Promise<void> {
    await contract.submitTransaction('GrantAccess', collection, key, granteeId);
}

export async function revokeAccess(
    contract: Contract,
    collection: string,
    key: string,
    granteeId: string,
): Promise<void> {
    await contract.submitTransaction('RevokeAccess', collection, key, granteeId);
}

export async function grantRole(
    contract: Contract,
    collection: string,
    key: string,
    role: string,
): Promise<void> {
    await contract.submitTransaction('GrantRole', collection, key, role);
}

export async function revokeRole(
    contract: Contract,
    collection: string,
    key: string,
    role: string,
): Promise<void> {
    await contract.submitTransaction('RevokeRole', collection, key, role);
}
