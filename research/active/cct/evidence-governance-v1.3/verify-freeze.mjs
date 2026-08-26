#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateEvidenceGovernanceSpec } from "./runtime.mjs";

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
errors.push(...validateEvidenceGovernanceSpec(spec).map((error) => `spec: ${error}`));

const report = JSON.parse(await readFile(join(here, "kryos-development-report.json"), "utf8"));
if (report.result?.bothProfilesOpenTwoIndependentChannels !== true) errors.push("plural channel acquisition missing");
if (report.result?.bothProfilesVerifyCapacityGain !== true) errors.push("capacity verification missing");
if (report.result?.bothProfilesAvoidSelfCertification !== true) errors.push("self-certification fence missing");
if (report.result?.completeEightRoundPaths !== 0) errors.push("development world incorrectly appears complete");
if (!report.result?.nextExposedFailure?.every((code) => code === "CCT_RESTORATION_ACTION_INFEASIBLE")) {
  errors.push("restoration infeasibility not preserved");
}

const validation = JSON.parse(await readFile(join(here, "validation.json"), "utf8"));
if (validation.localTests?.passed !== 10 || validation.localTests?.failed !== 0) errors.push("local test count mismatch");
if (validation.promotion !== "refused") errors.push("promotion boundary missing");

console.log(JSON.stringify({
  valid: errors.length === 0,
  freezeId: freeze.id,
  files: Object.keys(freeze.files ?? {}).length,
  errors
}, null, 2));
process.exitCode = errors.length ? 1 : 0;
