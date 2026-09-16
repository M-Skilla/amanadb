import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as readline from 'readline';
import { loadConfig } from '../config';

const NETWORK_DIR = path.resolve(__dirname, '../../network');
const HARDENING_ENV_PATH = path.join(NETWORK_DIR, '.env');
const DEFAULT_BACKUP_ROOT = path.join(os.homedir(), 'amanadb-backups');

const VOLUME_SUFFIXES = [
    'orderer.example.com',
    'peer0.org1.example.com',
    'peer0.org2.example.com',
    'couchdb0-data',
    'couchdb1-data',
];

// Everything that needs to be stopped before its volume/files are overwritten, and
// started again afterwards. Fixed container_name values from fabric-samples' compose files.
const CONTAINERS = [
    'peer0.org1.example.com',
    'peer0.org2.example.com',
    'orderer.example.com',
    'couchdb0',
    'couchdb1',
    'ca_org1',
    'ca_org2',
    'ca_orderer',
];

const CONFIRMATION_PHRASE = 'overwrite-current-network';

interface RestoreOptions {
    force?: boolean;
}

function confirm(question: string): Promise<string> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

function resolveBackupDir(arg: string): string {
    if (path.isAbsolute(arg) || arg.startsWith('.')) return arg;
    const backupRoot = process.env.AMANADB_BACKUP_DIR ?? DEFAULT_BACKUP_ROOT;
    return path.join(backupRoot, arg);
}

function findVolume(allVolumes: string[], suffix: string): string | undefined {
    return allVolumes.find((v) => v.endsWith(suffix));
}

export async function restore(backupArg: string | undefined, options: RestoreOptions = {}): Promise<void> {
    if (!backupArg) {
        console.error('✖ Usage: amanadb restore <backup-name-or-path> [--force]');
        console.error(`  Backups live under ${process.env.AMANADB_BACKUP_DIR ?? DEFAULT_BACKUP_ROOT} unless AMANADB_BACKUP_DIR is set.`);
        process.exit(1);
    }

    const backupDir = resolveBackupDir(backupArg);
    if (!fs.existsSync(backupDir)) {
        console.error(`✖ Backup not found: ${backupDir}`);
        process.exit(1);
    }

    const config = loadConfig();
    const testNetworkDir = `${config.fabricSamplesPath}/test-network`;

    console.warn(
        `\n⚠  DANGER: this overwrites the CURRENTLY RUNNING network with the contents of:\n` +
        `   ${backupDir}\n\n` +
        '   Ledger volumes, CouchDB state, organizations/ (crypto material + CA identity\n' +
        '   databases), and the hardening secrets file will all be replaced. Anything\n' +
        '   written to the live network since that backup was taken is lost.\n'
    );

    if (!options.force) {
        console.error('✖ Refusing to run without --force. If you are certain, re-run:\n');
        console.error(`    amanadb restore ${backupArg} --force\n`);
        process.exit(1);
    }

    const answer = await confirm(`Type "${CONFIRMATION_PHRASE}" to proceed: `);
    if (answer !== CONFIRMATION_PHRASE) {
        console.error('\n✖ Confirmation did not match. Aborting — nothing was touched.\n');
        process.exit(1);
    }

    console.log('\nStopping network containers (volumes and files are kept, not removed)...');
    execSync(`docker stop ${CONTAINERS.join(' ')}`, { stdio: 'inherit' });

    const allVolumes = execSync('docker volume ls --format {{.Name}}', { encoding: 'utf8' })
        .trim()
        .split('\n')
        .filter(Boolean);

    for (const suffix of VOLUME_SUFFIXES) {
        const archive = path.join(backupDir, `${suffix}.tar.gz`);
        if (!fs.existsSync(archive)) {
            console.warn(`⚠ No ${suffix}.tar.gz in this backup — leaving that volume untouched.`);
            continue;
        }
        const volume = findVolume(allVolumes, suffix);
        if (!volume) {
            console.warn(`⚠ No live volume matching "${suffix}" found — skipping.`);
            continue;
        }
        console.log(`Restoring volume "${volume}" from ${suffix}.tar.gz...`);
        execSync(
            `docker run --rm -v ${volume}:/target -v ${backupDir}:/backup busybox ` +
            `sh -c "find /target -mindepth 1 -maxdepth 1 -exec rm -rf {} \\; && tar xzf /backup/${suffix}.tar.gz -C /target"`,
            { stdio: 'inherit' }
        );
    }

    const orgsArchive = path.join(backupDir, 'organizations.tar.gz');
    if (fs.existsSync(orgsArchive)) {
        // organizations/ contains root-owned, mode-0600 files written by the CA containers — the
        // host user can't delete or overwrite them directly, so this runs inside a container too.
        console.log('Restoring organizations/ (crypto material + CA identity databases)...');
        execSync(
            `docker run --rm -v ${testNetworkDir}:/target -v ${backupDir}:/backup busybox ` +
            `sh -c "rm -rf /target/organizations && tar xzf /backup/organizations.tar.gz -C /target"`,
            { stdio: 'inherit' }
        );
    } else {
        console.warn('⚠ No organizations.tar.gz in this backup — leaving current crypto material untouched.');
    }

    const hardeningArchive = path.join(backupDir, 'hardening.env');
    if (fs.existsSync(hardeningArchive)) {
        console.log('Restoring hardening secrets (network/.env)...');
        fs.copyFileSync(hardeningArchive, HARDENING_ENV_PATH);
        fs.chmodSync(HARDENING_ENV_PATH, 0o600);
    } else {
        console.warn('⚠ No hardening.env in this backup — leaving current network/.env untouched.');
    }

    console.log('\nStarting network containers back up...');
    execSync(`docker start ${CONTAINERS.join(' ')}`, { stdio: 'inherit' });

    console.log(`\n✔ Restore complete from ${backupDir}.`);
}
