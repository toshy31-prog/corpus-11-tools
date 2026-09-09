import { readFileSync } from "node:fs";
import { verifySourceStatusAuthorityResolution } from "./source-status-authority-resolution.mjs";
const [resolutionPath, registryPath, currentStatusPath, policyPath, selectedKeyPath] = process.argv.slice(2);
if (!selectedKeyPath) { process.stderr.write("usage: node verify-source-status-authority-resolution.mjs RESOLUTION REGISTRY CURRENT_STATUS RECOVERY_POLICY SELECTED_AUTHORITY_PUBLIC_KEY\n"); process.exit(2); }
const result = verifySourceStatusAuthorityResolution(JSON.parse(readFileSync(resolutionPath, "utf8")), JSON.parse(readFileSync(registryPath, "utf8")), JSON.parse(readFileSync(currentStatusPath, "utf8")), JSON.parse(readFileSync(policyPath, "utf8")), readFileSync(selectedKeyPath, "utf8"));
process.stdout.write(`${JSON.stringify(result)}\n`); if (!result.ok) process.exitCode = 1;
