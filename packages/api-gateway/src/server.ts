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

    server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`\n✖ Port ${config.port} is already in use.`);
            console.error(`  Another process is already listening on this port.`);
            console.error(`  Set a different PORT in .env, or stop whatever's using ${config.port}.\n`);
        } else {
            console.error('\n✖ Failed to start the API Gateway:', err.message, '\n');
        }
        process.exit(1);
    });

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
