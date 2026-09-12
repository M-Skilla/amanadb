import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import { loadConfig } from '../config';

export function start(): void {
    const config = loadConfig();
    const keystorePath = `${config.gatewayPath}/.amanadb-keys.json`;

    if (!fs.existsSync(keystorePath)) {
        console.log('No API keys found — bootstrapping an initial admin key...');
        execSync('pnpm exec ts-node src/cli/keys.ts create --name root --role admin', {
            cwd: config.gatewayPath,
            stdio: 'inherit',
        });
        console.log('\n(Copy the key printed above — you\'ll need it for every request.)\n');
    } else {
        console.log('Existing API key store found — skipping bootstrap.');
    }

    console.log('Starting the API Gateway...');
    const child = spawn('pnpm', ['exec', 'ts-node', 'src/app.ts'], {
        cwd: config.gatewayPath,
        stdio: 'inherit',
    });

    child.on('exit', (code) => process.exit(code ?? 0));
}