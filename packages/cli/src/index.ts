import { Command } from 'commander';
import { init } from './commands/init';
import { deploy } from './commands/deploy';

const program = new Command();
program.name('amanadb').description('AmanaDB Orchestration CLI');

program.command('init').description('Bring up the Fabric network').action(init);

program.command('deploy').description("Deploy core chaincode to Fabric").action(deploy)

program.parse();