import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { loadConfig } from '../config';

const NETWORK_DIR = path.resolve(__dirname, '../../network');
const HARDENING_ENV_PATH = path.join(NETWORK_DIR, '.env');

// container_name values are fixed in fabric-samples' compose files, so unlike volume names
// (which get a compose-project-name prefix that isn't guaranteed stable) these are safe to
// hardcode.
const VOLUME_SUFFIXES = [
    'orderer.example.com',
    'peer0.org1.example.com',
    'peer0.org2.example.com',
    'couchdb0-data',
    'couchdb1-data',
];

const DEFAULT_BACKUP_ROOT = path.join(os.homedir(), 'amanadb-backups');
const RETENTION_COUNT = 14;

function findVolume(allVolumes: string[], suffix: string): string | undefined {
    return allVolumes.find((v) => v.endsWith(suffix));
}

function pruneOldBackups(backupRoot: string): void {
    const entries = fs.readdirSync(backupRoot, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort(); // ISO-like timestamp names sort chronologically as strings

    const toRemove = entries.slice(0, Math.max(0, entries.length - RETENTION_COUNT));
    for (const name of toRemove) {
        console.log(`Pruning old backup ${name} (retention: last ${RETENTION_COUNT})`);
        fs.rmSync(path.join(backupRoot, name), { recursive: true, force: true });
    }
}

export function backup(): void {
    const config = loadConfig();
    const testNetworkDir = `${config.fabricSamplesPath}/test-network`;

    if (!fs.existsSync(`${testNetworkDir}/organizations`)) {
        console.error('✖ No network found here — nothing to back up. Run "amanadb init" first.');
        process.exit(1);
    }

    const backupRoot = process.env.AMANADB_BACKUP_DIR ?? DEFAULT_BACKUP_ROOT;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dest = path.join(backupRoot, timestamp);
    fs.mkdirSync(dest, { recursive: true });

    console.log(`Backing up to ${dest}\n`);

    const allVolumes = execSync('docker volume ls --format {{.Name}}', { encoding: 'utf8' })
        .trim()
        .split('\n')
        .filter(Boolean);

    for (const suffix of VOLUME_SUFFIXES) {
        const volume = findVolume(allVolumes, suffix);
        if (!volume) {
            console.warn(`⚠ No volume matching "${suffix}" found — skipping (has the network been started yet?).`);
            continue;
        }
        console.log(`Backing up volume "${volume}"...`);
        execSync(
            `docker run --rm -v ${volume}:/source:ro -v ${dest}:/backup busybox ` +
            `tar czf /backup/${suffix}.tar.gz -C /source .`,
            { stdio: 'inherit' }
        );
    }

    // organizations/ contains files written by the CA containers as root (private key files are
    // mode 0600, owned by root) — the host user running this CLI can't read them directly, so we
    // read them from a container instead, same as the volume backups above.
    console.log('Backing up organizations/ (crypto material + CA identity databases)...');
    execSync(
        `docker run --rm -v ${testNetworkDir}:/source:ro -v ${dest}:/backup busybox ` +
        `tar czf /backup/organizations.tar.gz -C /source organizations`,
        { stdio: 'inherit' }
    );

    if (fs.existsSync(HARDENING_ENV_PATH)) {
        fs.copyFileSync(HARDENING_ENV_PATH, path.join(dest, 'hardening.env'));
    } else {
        console.warn('⚠ No hardening secrets file found at ' + HARDENING_ENV_PATH + ' — skipping (network not hardened yet?).');
    }

    console.log(`\n✔ Backup complete: ${dest}`);

    pruneOldBackups(backupRoot);
}
