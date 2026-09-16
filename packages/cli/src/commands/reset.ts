import { execSync } from 'child_process';
import * as readline from 'readline';
import { loadConfig } from '../config';

interface ResetOptions {
    force?: boolean;
}

const CONFIRMATION_PHRASE = 'destroy-everything';

function confirm(question: string): Promise<string> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

export async function reset(options: ResetOptions = {}): Promise<void> {
    const config = loadConfig();
    const testNetworkDir = `${config.fabricSamplesPath}/test-network`;

    console.warn(
        '\n⚠  DANGER: this does not just clear ledger data.\n' +
        '   "network.sh down" also deletes the Fabric CA identity database and all\n' +
        '   enrolled crypto material (organizations/) — every org, orderer, and any\n' +
        '   developer identity registered against this network.\n' +
        '   On a persistent/shared network this is almost never what you want.\n'
    );

    if (!options.force) {
        console.error('✖ Refusing to run without --force. If you are certain, re-run:\n');
        console.error('    amanadb reset --force\n');
        process.exit(1);
    }

    const answer = await confirm(`Type "${CONFIRMATION_PHRASE}" to proceed: `);
    if (answer !== CONFIRMATION_PHRASE) {
        console.error('\n✖ Confirmation did not match. Aborting — nothing was touched.\n');
        process.exit(1);
    }

    console.warn('\nTearing down the AmanaDB network — all ledger data and identities will be lost.\n');
    execSync('./network.sh down', { cwd: testNetworkDir, stdio: 'inherit' });

    console.log('\n✔ Network torn down. Run "amanadb init" to start fresh.');
}
