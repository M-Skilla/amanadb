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

export function checkDockerAccess(): void {
    try {
        execSync('docker info', { stdio: 'pipe' });
    } catch (err) {
        const stderr = (err as { stderr?: Buffer }).stderr?.toString() ?? '';
        if (stderr.includes('permission denied') && stderr.includes('docker.sock')) {
            console.error(
                '✘ Permission denied connecting to the Docker daemon.\n' +
                '  Your user is not in the "docker" group. Fix it with:\n\n' +
                '    sudo usermod -aG docker $USER\n' +
                '    newgrp docker\n\n' +
                '  Then log out and back in if "newgrp" does not take effect, and re-run this command.'
            );
        } else {
            console.error('✘ Docker does not appear to be running or accessible:\n', stderr || (err as Error).message);
        }
        process.exit(1);
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