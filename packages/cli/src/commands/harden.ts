import { execSync } from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { loadConfig } from '../config';
import { checkDockerAccess } from '../preflight';

const NETWORK_DIR = path.resolve(__dirname, '../../network');
const ENV_PATH = path.join(NETWORK_DIR, '.env');
const OVERRIDE_COMPOSE_FILE = path.join(NETWORK_DIR, 'docker-compose.persistent.yaml');

// Usernames don't need to be secret — only the paired passwords do.
const STATIC_VARS: Record<string, string> = {
    CA_ORG1_ADMIN_USER: 'admin',
    CA_ORG2_ADMIN_USER: 'admin',
    CA_ORDERER_ADMIN_USER: 'admin',
    COUCHDB_ORG1_USER: 'admin',
    COUCHDB_ORG2_USER: 'admin',
};

const SECRET_VARS = [
    'CA_ORG1_ADMIN_PASS',
    'CA_ORG2_ADMIN_PASS',
    'CA_ORDERER_ADMIN_PASS',
    'COUCHDB_ORG1_PASS',
    'COUCHDB_ORG2_PASS',
];

function generateSecret(): string {
    return crypto.randomBytes(24).toString('base64url');
}

function ensureEnvFile(): void {
    if (fs.existsSync(ENV_PATH)) {
        console.log(`Using existing secrets at ${ENV_PATH} (delete it to force-regenerate).`);
        return;
    }

    console.log('No hardening secrets found — generating new ones...');
    const lines = [
        ...Object.entries(STATIC_VARS).map(([k, v]) => `${k}=${v}`),
        ...SECRET_VARS.map((k) => `${k}=${generateSecret()}`),
    ];
    fs.writeFileSync(ENV_PATH, lines.join('\n') + '\n', { mode: 0o600 });
    console.log(`✔ Wrote ${ENV_PATH} (0600, gitignored — this is the only copy, back it up separately).`);
}

export function harden(): void {
    const config = loadConfig();
    checkDockerAccess();
    const testNetworkDir = `${config.fabricSamplesPath}/test-network`;

    if (!fs.existsSync(`${testNetworkDir}/organizations/peerOrganizations`)) {
        console.error('✖ No network found here — run "amanadb init" first, then "amanadb harden".');
        process.exit(1);
    }

    ensureEnvFile();

    console.log('\nApplying hardened CA/CouchDB credentials, CouchDB persistence, and restart policies...');
    console.log('(only containers with changed config are recreated — no ledger data is affected)\n');

    // Mirrors network.sh's own derivation of DOCKER_SOCK from DOCKER_HOST, since we're
    // calling docker compose directly here instead of going through network.sh.
    const dockerSock = (process.env.DOCKER_HOST ?? '/var/run/docker.sock').replace(/^unix:\/\//, '');

    const composeFiles = [
        'compose/compose-test-net.yaml',
        'compose/docker/docker-compose-test-net.yaml',
        'compose/compose-couch.yaml',
        'compose/compose-ca.yaml',
        OVERRIDE_COMPOSE_FILE,
    ].map((f) => `-f ${f}`).join(' ');

    execSync(
        `docker compose ${composeFiles} --env-file ${ENV_PATH} up -d`,
        {
            cwd: testNetworkDir,
            stdio: 'inherit',
            env: { ...process.env, DOCKER_SOCK: dockerSock },
        }
    );

    console.log(
        '\n✔ Network hardened.\n' +
        `  - CA/CouchDB now require the credentials in ${ENV_PATH}\n` +
        '  - Fabric containers will restart automatically on daemon/host reboot\n' +
        '  - Re-run "amanadb harden" any time (e.g. after "amanadb init") to re-apply — it is idempotent.'
    );
}
