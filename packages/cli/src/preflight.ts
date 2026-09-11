import { execSync } from 'child_process';

interface Dependency {
    command: string;
    installHint: string;
}

const DEPENDENCIES: Dependency[] = [
    { command: 'git', installHint: 'https://git-scm.com/downloads' },
    { command: 'docker', installHint: 'https://docs.docker.com/get-docker/' },
    { command: 'jq', installHint: 'Ubuntu/Debian: sudo apt-get install jq   |   macOS: brew install jq' },
    { command: 'curl', installHint: 'Ubuntu/Debian: sudo apt-get install curl' },
];

function isInstalled(command: string): boolean {
    try {
        execSync(`command -v ${command}`, { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

export function checkPreflight(): void {
    const missing = DEPENDENCIES.filter(d => !isInstalled(d.command));
    if (missing.length === 0) return;

    console.error('\n✖ Missing required dependencies:\n');
    for (const dep of missing) {
        console.error(`  - ${dep.command}`);
        console.error(`    Install: ${dep.installHint}\n`);
    }
    console.error('Install the above, then re-run "amanadb init".\n');
    process.exit(1);
}