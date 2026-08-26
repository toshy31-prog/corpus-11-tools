#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyScenarioFreeze } from "../../../../../corpus-11-tools/labs/experiment-lab/arena/declarative/hash.mjs";
import { validateProjectionContract } from "./runtime.mjs";

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

const contract = JSON.parse(await readFile(join(here, "contract.json"), "utf8"));
errors.push(...validateProjectionContract(contract).map((error) => `contract: ${error}`));
const world = JSON.parse(await readFile(resolve(here, contract.worldFreeze.path), "utf8"));
try {
  const actual = verifyScenarioFreeze(world);
  if (actual !== contract.worldFreeze.contentHash) errors.push(`world freeze mismatch: ${actual}`);
} catch (error) {
  errors.push(`world: ${error.message}`);
}
const cctFreeze = JSON.parse(await readFile(resolve(here, contract.cctFreeze.path), "utf8"));
if (cctFreeze.id !== contract.cctFreeze.id) errors.push("CCT freeze id mismatch");
const report = JSON.parse(await readFile(join(here, "campaign-report.json"), "utf8"));
if (report.vectorVerdict?.cctControlFailures !== 2) errors.push("campaign does not preserve both CCT control failures");
if (report.vectorVerdict?.cctEightRoundCompletions !== 0) errors.push("campaign incorrectly claims a complete CCT path");
if (report.methodEffectAudit?.neutralityClaim !== "withdrawn") errors.push("projection neutrality boundary missing");
if (report.transportVerdict !== "not_transportable_without_method_added_institutional_semantics") errors.push("transport verdict drift");

console.log(JSON.stringify({ valid: errors.length === 0, freezeId: freeze.id, files: Object.keys(freeze.files ?? {}).length, errors }, null, 2));
process.exitCode = errors.length ? 1 : 0;
