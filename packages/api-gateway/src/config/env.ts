import 'dotenv/config'


function requireEnv(name: string): string {
    const value = process.env[name]
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`)
    }
    return value;
}


export const config = {
    port: Number(process.env.PORT ?? 3000),
    channelName: process.env.AMANADB_CHANNEL ?? 'mychannel',
    chaincodeName: process.env.AMANADB_CHAINCODE ?? 'storage',
    fabric: {
        mspId: process.env.AMANADB_MSP_ID ?? 'Org1MSP',
        certPath: requireEnv('AMANADB_CERT_PATH'),
        keyPath: requireEnv('AMANADB_KEY_PATH'),
        peerEndpoint: process.env.AMANADB_PEER_ENDPOINT ?? 'localhost:7051',
        peerTlsCertPath: requireEnv('AMANADB_PEER_TLS_CERT_PATH'),
        peerHostAlias: process.env.AMANADB_PEER_HOST_ALIAS ?? 'peer0.org1.example.com',
    },
} as const;
