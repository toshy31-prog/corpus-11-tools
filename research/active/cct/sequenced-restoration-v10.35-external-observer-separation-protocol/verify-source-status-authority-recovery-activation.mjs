import { readFileSync } from "node:fs";
import { verifySourceStatusAuthorityRecoveryActivation } from "./source-status-authority-recovery-activation.mjs";
const paths = process.argv.slice(2); if (paths.length !== 8) { process.stderr.write("usage: node verify-source-status-authority-recovery-activation.mjs ACTIVATION RESOLUTION REGISTRY PREVIOUS_STATUS FIRST_STATUS POLICY SELECTED_PUBLIC_KEY TIME_EVIDENCE\n"); process.exit(2); }
const json = index => JSON.parse(readFileSync(paths[index], "utf8"));
const result = verifySourceStatusAuthorityRecoveryActivation(json(0), json(1), json(2), json(3), json(4), json(5), readFileSync(paths[6], "utf8"), json(7));
process.stdout.write(`${JSON.stringify(result)}\n`); if (!result.ok) process.exitCode = 1;
