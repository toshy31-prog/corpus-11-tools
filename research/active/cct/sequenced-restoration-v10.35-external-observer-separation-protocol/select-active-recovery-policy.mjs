import { readFileSync } from "node:fs";
import { selectActiveRecoveryPolicy } from "./recovery-policy-history.mjs";
const [initialPath, transitionsPath, successorsPath, generationText] = process.argv.slice(2); if (!generationText) { process.stderr.write("usage: node select-active-recovery-policy.mjs INITIAL_POLICY TRANSITIONS_JSON SUCCESSOR_POLICIES_JSON STATUS_GENERATION\n"); process.exit(2); }
const result = selectActiveRecoveryPolicy(JSON.parse(readFileSync(initialPath, "utf8")), JSON.parse(readFileSync(transitionsPath, "utf8")), JSON.parse(readFileSync(successorsPath, "utf8")), Number(generationText));
process.stdout.write(`${JSON.stringify(result)}\n`); if (!result.ok) process.exitCode = 1;
