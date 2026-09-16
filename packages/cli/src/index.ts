import { Command } from 'commander';
import { init } from './commands/init';
import { deploy } from './commands/deploy';
import { start } from './commands/start';
import { reset } from './commands/reset';
import { harden } from './commands/harden';
import { backup } from './commands/backup';
import { restore } from './commands/restore';

const program = new Command();
program.name('amanadb').description('AmanaDB Orchestration CLI');

program.command('init').description('Bring up the Fabric network').action(init);

program.command('deploy').description("Deploy core chaincode to Fabric").action(deploy)

program.command('start').description("Start the database server").action(start)

program.command('harden').description('Apply hardened credentials, CouchDB persistence, and restart policies to the running network').action(harden)

program.command('backup').description('Snapshot ledger volumes, CouchDB, crypto material, and hardening secrets to AMANADB_BACKUP_DIR (default ~/amanadb-backups)').action(backup);

program.command('restore <backupName>')
    .description('DANGEROUS: stop the network and overwrite it with a prior backup')
    .option('--force', 'required to run at all; still prompts for a typed confirmation')
    .action(restore);

program.command('reset')
    .description('DANGEROUS: tear down the network, deleting all ledger data AND enrolled CA identities')
    .option('--force', 'required to run at all; still prompts for a typed confirmation')
    .action(reset);

program.parseAsync();