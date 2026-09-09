import { readFileSync } from "node:fs";
import { verifyRecoveryPolicyEquivocationResolution } from "./recovery-policy-equivocation-resolution.mjs";
const paths = process.argv.slice(2); if (paths.length !== 4) { process.stderr.write("usage: node verify-recovery-policy-equivocation-resolution.mjs RESOLUTION CONFLICT_BUNDLE PREVIOUS_POLICY CURRENT_STATUS\n"); process.exit(2); }
const json = index => JSON.parse(readFileSync(paths[index], "utf8")); const result = verifyRecoveryPolicyEquivocationResolution(json(0), json(1), json(2), json(3)); process.stdout.write(`${JSON.stringify(result)}\n`); if (!result.ok) process.exitCode = 1;
