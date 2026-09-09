import { readFileSync } from "node:fs";
import { verifyNetworkSeparationEvidence } from "./network-separation-evidence.mjs";

const [evidencePath, sourceRegistryPath, observerRegistryPath, challengePath] = process.argv.slice(2);
if (!challengePath) {
  process.stderr.write("usage: node verify-network-separation-evidence.mjs EVIDENCE SOURCE_REGISTRY OBSERVER_REGISTRY CHALLENGE\n");
  process.exit(2);
}
const read = path => JSON.parse(readFileSync(path, "utf8"));
const result = verifyNetworkSeparationEvidence(read(evidencePath), read(sourceRegistryPath), read(observerRegistryPath), read(challengePath));
process.stdout.write(`${JSON.stringify(result)}\n`);
if (!result.ok) process.exitCode = 1;
