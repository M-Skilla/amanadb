import * as grpc from '@grpc/grpc-js';
import { connect, Gateway, Identity, Signer, signers } from '@hyperledger/fabric-gateway';
import * as fs from 'fs';
import { createPrivateKey } from 'crypto';
import { config } from '../config/env';

// One of Option B's shared service identities — e.g. Org1's, enrolled
// once via fabric-ca-client exactly like `auditor1` was, not per app-user.
async function newGrpcConnection(): Promise<grpc.Client> {
    const tlsRootCert = fs.readFileSync(config.fabric.peerTlsCertPath);
    const credentials = grpc.credentials.createSsl(tlsRootCert);
    return new grpc.Client(config.fabric.peerEndpoint, credentials, {
        'grpc.ssl_target_name_override': config.fabric.peerHostAlias,
    });
}

async function newIdentity(): Promise<Identity> {
    const credentials = fs.readFileSync(config.fabric.certPath);
    return { mspId: config.fabric.mspId, credentials };
}

async function newSigner(): Promise<Signer> {
    const privateKeyPem = fs.readFileSync(config.fabric.keyPath);
    const privateKey = createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
}

export async function connectGateway(): Promise<{ gateway: Gateway; client: grpc.Client }> {
    const client = await newGrpcConnection();
    const gateway = connect({
        client,
        identity: await newIdentity(),
        signer: await newSigner(),
    });
    return { gateway, client };
}
