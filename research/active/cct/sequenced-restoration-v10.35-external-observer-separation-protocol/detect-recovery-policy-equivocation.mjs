import { readFileSync } from "node:fs";
import { detectRecoveryPolicyEquivocation } from "./recovery-policy-equivocation.mjs";
const paths = process.argv.slice(2); if (paths.length !== 5) { process.stderr.write("usage: node detect-recovery-policy-equivocation.mjs LEFT LEFT_NEXT_POLICY RIGHT RIGHT_NEXT_POLICY PREVIOUS_POLICY\n"); process.exit(2); }
const json = index => JSON.parse(readFileSync(paths[index], "utf8")); const result = detectRecoveryPolicyEquivocation(json(0), json(1), json(2), json(3), json(4));
process.stdout.write(`${JSON.stringify(result)}\n`); if (!result.ok) process.exitCode = 1;
