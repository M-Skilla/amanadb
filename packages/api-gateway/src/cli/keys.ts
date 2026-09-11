import { Command } from 'commander';
import { createApiKey, listApiKeys, revokeApiKey, verifyApiKey } from '../apiKeys/store';

const program = new Command();
program.name('keys').description('Manage AmanaDB API Gateway keys');

program
    .command('create')
    .requiredOption('--name <name>', 'a unique, human-readable name for this key')
    .requiredOption('--role <role>', 'admin or client')
    .action((opts) => {
        if (opts.role !== 'admin' && opts.role !== 'client') {
            console.error('--role must be "admin" or "client"');
            process.exit(1);
        }
        const rawKey = createApiKey(opts.name, opts.role);
        console.log(`\n✔ API key created: ${rawKey}`);
        console.log('  Save this now — it will not be shown again.\n');
    });

program
    .command('list')
    .action(() => {
        const keys = listApiKeys();
        if (keys.length === 0) {
            console.log('No API keys yet.');
            return;
        }
        console.table(keys);
    });

program
    .command('revoke')
    .requiredOption('--name <name>', 'the name of the key to revoke')
    .action((opts) => {
        const revoked = revokeApiKey(opts.name);
        console.log(revoked ? `✔ Revoked key "${opts.name}"` : `No key found named "${opts.name}"`);
    });

program
    .command('verify')
    .requiredOption('--key <key>', "the raw API key for verifying")
    .action(opts => {
        const verified = verifyApiKey(opts.key)
        if (!verified) {
            console.log('This key is invalid')
            return;
        }
        console.log(`API Key ${opts.key} is valid`)
    })

program.parse();    