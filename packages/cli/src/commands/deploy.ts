import { execSync } from 'child_process';
import { ensureGatewayIdentity, loadConfig } from '../config';
import { checkPreflight } from '../preflight';



export function deploy(): void {
    checkPreflight();
    const config = loadConfig();
    const testNetworkDir = `${config.fabricSamplesPath}/test-network`;

    console.log(`Deploying chaincode "${config.chaincodeName}" from ${config.chaincodePath}...`);
    execSync(
        `./network.sh deployCC -ccn ${config.chaincodeName} -ccp ${config.chaincodePath} -ccl typescript`,
        { cwd: testNetworkDir, stdio: 'inherit' }
    );

    ensureGatewayIdentity(config)

    console.log('\n✔ Chaincode deployed. Run "amanadb start" next.');
}