import { execSync } from 'child_process';
import * as fs from 'fs';
import { loadConfig } from '../config';
import { checkPreflight } from '../preflight';

const FABRIC_VERSION = '2.5.16';
const CA_VERSION = '1.5.17';

function checkDockerAccess(): void {
    try {
        execSync('docker info', { stdio: 'pipe' });
    } catch (err) {
        const stderr = (err as { stderr?: Buffer }).stderr?.toString() ?? '';
        if (stderr.includes('permission denied') && stderr.includes('docker.sock')) {
            console.error(
                '✘ Permission denied connecting to the Docker daemon.\n' +
                '  Your user is not in the "docker" group. Fix it with:\n\n' +
                '    sudo usermod -aG docker $USER\n' +
                '    newgrp docker\n\n' +
                '  Then log out and back in if "newgrp" does not take effect, and re-run this command.'
            );
        } else {
            console.error('✘ Docker does not appear to be running or accessible:\n', stderr || (err as Error).message);
        }
        process.exit(1);
    }
}

export function init(): void {
    checkPreflight()
    const config = loadConfig();
    checkDockerAccess();
    const testNetworkDir = `${config.fabricSamplesPath}/test-network`;

    if (!fs.existsSync(config.fabricSamplesPath)) {
        console.log('fabric-samples not found — cloning...');
        const parentDir = require('path').dirname(config.fabricSamplesPath);
        fs.mkdirSync(parentDir, { recursive: true });
        console.log(`Installing Fabric binaries/images (pinned: v${FABRIC_VERSION}, CA v${CA_VERSION})...`);
        execSync(
            `curl -sSL https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh | bash -s -- --fabric-version ${FABRIC_VERSION} --ca-version ${CA_VERSION} docker samples binary`,
            { cwd: parentDir, stdio: 'inherit' }
        );
    } else {
        console.log(`Using existing fabric-samples at ${config.fabricSamplesPath}`);
    }

    const existingContainers = execSync(
        `docker ps -a --filter "name=peer0.org1" -q`,
        { encoding: 'utf8' }
    ).trim();

    if (existingContainers.length > 0) {
        console.error('\n✖ An AmanaDB network already appears to exist.');
        console.error('  If you\'re hitting errors, run "amanadb reset" first, then retry "amanadb init".\n');
        process.exit(1);
    }

    console.log('Bringing up the network...');
    execSync(`./network.sh up createChannel -c ${config.channelName} -ca -s couchdb`, {
        cwd: testNetworkDir,
        stdio: 'inherit',
    });

    console.log('\n✔ Network is up. Run "amanadb deploy" next.');
}