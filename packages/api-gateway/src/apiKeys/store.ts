import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export type ApiKeyRole = 'admin' | 'client';

interface StoredKey {
    name: string;
    role: ApiKeyRole;
    hash: string;      // sha256 of the raw key — never the raw key itself
    createdAt: string;
}

const STORE_PATH = process.env.AMANADB_KEYSTORE_PATH ?? path.join(process.cwd(), '.amanadb-keys.json');

function hashKey(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
}

function loadStore(): StoredKey[] {
    if (!fs.existsSync(STORE_PATH)) return [];
    const content = fs.readFileSync(STORE_PATH, 'utf8').trim();
    if (content.length === 0) return []; // empty file — treat same as "doesn't exist yet"
    return JSON.parse(content);
}

function saveStore(keys: StoredKey[]): void {
    fs.writeFileSync(STORE_PATH, JSON.stringify(keys, null, 2), { mode: 0o600 });
    // 0o600 restricts to owner read-write only
}

export function createApiKey(name: string, role: ApiKeyRole): string {
    const rawKey = `amdb_${role}_${crypto.randomBytes(24).toString('hex')}`;
    const keys = loadStore();
    keys.push({ name, role, hash: hashKey(rawKey), createdAt: new Date().toISOString() });
    saveStore(keys);
    return rawKey; // the only moment the raw key ever exists outside the caller's terminal
}

export function verifyApiKey(rawKey: string): { name: string; role: ApiKeyRole } | null {
    const hash = hashKey(rawKey);
    const match = loadStore().find(k => k.hash === hash);
    return match ? { name: match.name, role: match.role } : null;
}

export function listApiKeys(): Array<{ name: string; role: ApiKeyRole; createdAt: string }> {
    return loadStore().map(({ name, role, createdAt }) => ({ name, role, createdAt }));
}

export function revokeApiKey(name: string): boolean {
    const keys = loadStore();
    const filtered = keys.filter(k => k.name !== name);
    if (filtered.length === keys.length) return false; // nothing matched
    saveStore(filtered);
    return true;
}