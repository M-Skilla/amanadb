import { Command } from 'commander';
import { init } from './commands/init';
import { deploy } from './commands/deploy';
import { start } from './commands/start';

const program = new Command();
program.name('amanadb').description('AmanaDB Orchestration CLI');

program.command('init').description('Bring up the Fabric network').action(init);

program.command('deploy').description("Deploy core chaincode to Fabric").action(deploy)

program.command('start').description("Start the database server").action(start)

program.parse();