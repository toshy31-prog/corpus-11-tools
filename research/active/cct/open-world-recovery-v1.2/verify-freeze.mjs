#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateOpenWorldSpec } from "./runtime.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const freeze = JSON.parse(await readFile(join(here, "freeze.json"), "utf8"));
const errors = [];
for (const [file, expected] of Object.entries(freeze.files ?? {})) {
  const actual = createHash("sha256").update(await readFile(resolve(here, file))).digest("hex");
  if (actual !== expected) errors.push(`${file}: expected ${expected}, got ${actual}`);
}
for (const basisPath of freeze.basisFreezes ?? []) {
  try {
    const basis = JSON.parse(await readFile(resolve(here, basisPath), "utf8"));
    if (!basis.id) errors.push(`basis freeze lacks id: ${basisPath}`);
  } catch (error) {
    errors.push(`basis freeze invalid: ${basisPath}: ${error.message}`);
  }
}
const spec = JSON.parse(await readFile(join(here, "spec.json"), "utf8"));
errors.push(...validateOpenWorldSpec(spec).map((error) => `spec: ${error}`));
const report = JSON.parse(await readFile(join(here, "virelia-development-report.json"), "utf8"));
if (report.result?.bothProfilesAvoidFalseI13Attribution !== true) errors.push("VF-01 regression repair missing");
if (report.result?.bothProfilesReachCapacityAcquisition !== true) errors.push("VF-02 acquisition path missing");
if (report.result?.bothProfilesRejectUnverifiedGain !== true) errors.push("unverified capacity fence missing");
if (report.result?.completeEightRoundPaths !== 0) errors.push("observed development world incorrectly appears complete");

console.log(JSON.stringify({ valid: errors.length === 0, freezeId: freeze.id, files: Object.keys(freeze.files ?? {}).length, errors }, null, 2));
process.exitCode = errors.length ? 1 : 0;
