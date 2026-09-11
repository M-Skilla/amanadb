import { config } from './config/env';
import { connectGateway } from './fabric/gateway';
import { createApp } from './app';

async function main(): Promise<void> {
    const { gateway, client } = await connectGateway();
    const network = gateway.getNetwork(config.channelName);
    const contract = network.getContract(config.chaincodeName);

    const app = createApp(contract);
    const server = app.listen(config.port, () =>
        console.log(`AmanaDB API Gateway listening on port ${config.port}`),
    );

    const shutdown = (): void => {
        server.close(() => {
            gateway.close();
            client.close();
            process.exit(0);
        });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

main().catch((err) => {
    console.error('Failed to start API Gateway:', err);
    process.exit(1);
});
