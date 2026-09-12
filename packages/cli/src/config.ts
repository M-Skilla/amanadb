import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execSync } from "child_process";

interface AmanaConfig {
  channelName: string;
  fabricSamplesPath: string;
  chaincodePath: string;
  chaincodeName: string;
  gatewayPath: string;
}

function expandHome(p: string): string {
  return p.startsWith("~") ? path.join(os.homedir(), p.slice(1)) : p;
}

function findConfigFile(startDir: string): string {
    let dir = startDir;
    while (true) {
        const candidate = path.join(dir, 'amanadb.config.json');
        if (fs.existsSync(candidate)) return candidate;

        const parent = path.dirname(dir);
        if (parent === dir) {
            console.error('amanadb.config.json not found in this directory or any parent directory.');
            console.error('Run this command from within your AmanaDB workspace.');
            process.exit(1);
        }
        dir = parent;
    }
}

export function loadConfig(): AmanaConfig {
  const configPath = findConfigFile(process.cwd());
    const workspaceRoot = path.dirname(configPath);
  const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
  return {
    ...raw,
    fabricSamplesPath: expandHome(raw.fabricSamplesPath),
    chaincodePath: path.resolve(workspaceRoot, raw.chaincodePath),
    gatewayPath: path.resolve(workspaceRoot, raw.gatewayPath),
  };
}

// packages/cli/src/commands/deploy.ts, added after the chaincode deploy step
export function ensureGatewayIdentity(config: AmanaConfig): void {
    const testNetworkDir = `${config.fabricSamplesPath}/test-network`;
    const mspDir = `${testNetworkDir}/organizations/peerOrganizations/org1.example.com/users/org1-service@org1.example.com/msp`;

    if (!fs.existsSync(mspDir)) {
        console.log('Enrolling gateway service identity (org1-service)...');
        const caClientHome = `${testNetworkDir}/organizations/peerOrganizations/org1.example.com/`;
        const tlsCert = `${testNetworkDir}/organizations/fabric-ca/org1/tls-cert.pem`;
        const env = { ...process.env, FABRIC_CA_CLIENT_HOME: caClientHome };

        execSync(
            `fabric-ca-client register --caname ca-org1 --id.name org1-service --id.secret org1servicepw --id.type client --tls.certfiles ${tlsCert}`,
            { env, stdio: 'inherit' }
        );
        execSync(
            `fabric-ca-client enroll -u https://org1-service:org1servicepw@localhost:7054 --caname ca-org1 -M ${mspDir} --tls.certfiles ${tlsCert}`,
            { env, stdio: 'inherit' }
        );
        fs.copyFileSync(
            `${testNetworkDir}/organizations/peerOrganizations/org1.example.com/msp/config.yaml`,
            `${mspDir}/config.yaml`
        );
    }

    const keystoreFiles = fs.readdirSync(`${mspDir}/keystore`);
    const keyFile = keystoreFiles[0]; // the hash-named private key file

    const envContent = [
        `PORT=3000`,
        `AMANADB_CHANNEL=${config.channelName}`,
        `AMANADB_CHAINCODE=${config.chaincodeName}`,
        `AMANADB_MSP_ID=Org1MSP`,
        `AMANADB_CERT_PATH=${mspDir}/signcerts/cert.pem`,
        `AMANADB_KEY_PATH=${mspDir}/keystore/${keyFile}`,
        `AMANADB_PEER_ENDPOINT=localhost:7051`,
        `AMANADB_PEER_TLS_CERT_PATH=${testNetworkDir}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt`,
        `AMANADB_PEER_HOST_ALIAS=peer0.org1.example.com`,
    ].join('\n');

    fs.writeFileSync(`${config.gatewayPath}/.env`, envContent);
    console.log('✔ Gateway .env generated automatically.');
}
