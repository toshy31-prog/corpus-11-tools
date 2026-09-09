import { readFileSync } from "node:fs";
import { detectSourceStatusAuthorityEquivocation } from "./source-status-authority-equivocation.mjs";
const [leftPath, leftNextKeyPath, rightPath, rightNextKeyPath, previousKeyPath] = process.argv.slice(2);
if (!previousKeyPath) { process.stderr.write("usage: node detect-source-status-authority-equivocation.mjs LEFT_TRANSITION LEFT_NEXT_PUBLIC_KEY RIGHT_TRANSITION RIGHT_NEXT_PUBLIC_KEY PREVIOUS_PUBLIC_KEY\n"); process.exit(2); }
const result = detectSourceStatusAuthorityEquivocation(JSON.parse(readFileSync(leftPath, "utf8")), readFileSync(leftNextKeyPath, "utf8"), JSON.parse(readFileSync(rightPath, "utf8")), readFileSync(rightNextKeyPath, "utf8"), readFileSync(previousKeyPath, "utf8"));
process.stdout.write(`${JSON.stringify(result)}\n`);
if (!result.ok) process.exitCode = 1;
