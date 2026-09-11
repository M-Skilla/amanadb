import * as fs from "fs";
import * as path from "path";
import * as os from "os";

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

export function loadConfig(): AmanaConfig {
  const configPath = path.resolve(process.cwd(), "amanadb.config.json");
  if (!fs.existsSync(configPath)) {
    console.error(`amanadb.config.json not found at ${configPath}`);
    console.error("Run this command from your AmanaDB workspace root.");
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
  return {
    ...raw,
    fabricSamplesPath: expandHome(raw.fabricSamplesPath),
    chaincodePath: path.resolve(process.cwd(), raw.chaincodePath),
    gatewayPath: path.resolve(process.cwd(), raw.gatewayPath),
  };
}
