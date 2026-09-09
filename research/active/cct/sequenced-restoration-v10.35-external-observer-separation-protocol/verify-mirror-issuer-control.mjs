import { readFileSync } from "node:fs";
import { assessMirrorIssuerControl } from "./mirror-issuer-control.mjs";

const [firstCorroborationPath, secondCorroborationPath, profilesPath, claimsPath, challengesPath, sourceRegistryPath, sourceStatusHistoryPath, sourceAuthorityPublicKeyPath, sourceAuthorityTransitionPath, nextSourceAuthorityPublicKeyPath, equivocationBundlesPath, recoveryBundlesPath] = process.argv.slice(2);
if (!recoveryBundlesPath) {
  process.stderr.write("usage: node verify-mirror-issuer-control.mjs ... EQUIVOCATION_BUNDLES_JSON RECOVERY_BUNDLES_JSON\n");
  process.exit(2);
}
const result = assessMirrorIssuerControl(
  [JSON.parse(readFileSync(firstCorroborationPath, "utf8")), JSON.parse(readFileSync(secondCorroborationPath, "utf8"))],
  JSON.parse(readFileSync(profilesPath, "utf8")), JSON.parse(readFileSync(claimsPath, "utf8")), JSON.parse(readFileSync(challengesPath, "utf8")), JSON.parse(readFileSync(sourceRegistryPath, "utf8")), JSON.parse(readFileSync(sourceStatusHistoryPath, "utf8")), readFileSync(sourceAuthorityPublicKeyPath, "utf8"), sourceAuthorityTransitionPath === "-" ? null : JSON.parse(readFileSync(sourceAuthorityTransitionPath, "utf8")), nextSourceAuthorityPublicKeyPath === "-" ? null : (() => { const text = readFileSync(nextSourceAuthorityPublicKeyPath, "utf8"); try { const value = JSON.parse(text); return Array.isArray(value) ? value : text; } catch { return text; } })(), JSON.parse(readFileSync(equivocationBundlesPath, "utf8")), JSON.parse(readFileSync(recoveryBundlesPath, "utf8"))
);
process.stdout.write(`${JSON.stringify({ ...result, realWorldIndependenceEstablished: false })}\n`);
if (!result.ok) process.exitCode = 1;
