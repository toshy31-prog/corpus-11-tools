#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const freeze = JSON.parse(await readFile(join(here, "freeze.json"), "utf8"));
const errors = [];
for (const [file, expected] of Object.entries(freeze.files ?? {})) {
  const actual = createHash("sha256").update(await readFile(resolve(here, file))).digest("hex");
  if (actual !== expected) errors.push(`${file}: expected ${expected}, got ${actual}`);
}
const report = JSON.parse(await readFile(join(here, "report.json"), "utf8"));
if (report.result?.minimumDebtAxes !== 2 || report.result?.stagedPlanFeasible !== true) errors.push("minimal structural witness missing");
console.log(JSON.stringify({ valid: errors.length === 0, freezeId: freeze.id, files: Object.keys(freeze.files ?? {}).length, errors }, null, 2));
process.exitCode = errors.length ? 1 : 0;
