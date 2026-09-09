import { readFileSync } from "node:fs";
import { verifyRecoveryPolicyTransition } from "./recovery-policy-transition.mjs";
const [transitionPath, previousPolicyPath, nextPolicyPath] = process.argv.slice(2); if (!nextPolicyPath) { process.stderr.write("usage: node verify-recovery-policy-transition.mjs TRANSITION PREVIOUS_POLICY NEXT_POLICY\n"); process.exit(2); }
const result = verifyRecoveryPolicyTransition(JSON.parse(readFileSync(transitionPath, "utf8")), JSON.parse(readFileSync(previousPolicyPath, "utf8")), JSON.parse(readFileSync(nextPolicyPath, "utf8")));
process.stdout.write(`${JSON.stringify(result)}\n`); if (!result.ok) process.exitCode = 1;
