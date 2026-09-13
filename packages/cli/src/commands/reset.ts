import { execSync } from 'child_process';
import { loadConfig } from '../config';

export function reset(): void {
    const config = loadConfig();
    const testNetworkDir = `${config.fabricSamplesPath}/test-network`;

    console.warn('⚠  Tearing down the AmanaDB network — all ledger data will be lost.\n');
    execSync('./network.sh down', { cwd: testNetworkDir, stdio: 'inherit' });

    console.log('\n✔ Network torn down. Run "amanadb init" to start fresh.');
}