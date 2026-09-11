import { config } from '../config/env';
import { connectGateway } from '../fabric/gateway';

async function main() {
    const { gateway, client } = await connectGateway();
    try {
        const network = gateway.getNetwork(config.channelName);
        const contract = network.getContract(config.chaincodeName);

        // A plain read — cheapest possible way to confirm the identity,
        // TLS, and gRPC connection are all correctly wired before we
        // trust this connection with anything that writes.
        const resultBytes = await contract.evaluateTransaction(
            'GetRecordsInCollection', 'invoices', '5', ''
        );
        console.log('GetRecordsInCollection result:', Buffer.from(resultBytes).toString('utf8'));
    } finally {
        gateway.close();
        client.close();
    }
}

main().catch(err => {
    console.error('Smoke test failed:', err);
    process.exit(1);
});
