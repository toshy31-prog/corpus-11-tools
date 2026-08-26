#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyScenarioFreeze } from "../../../../../corpus-11-tools/labs/experiment-lab/arena/declarative/hash.mjs";
import { validateRichDocument } from "./interpreter.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const freeze = JSON.parse(await readFile(join(here, "freeze.json"), "utf8"));
const errors = [];

for (const [file, expected] of Object.entries(freeze.files ?? {})) {
  const actual = createHash("sha256").update(await readFile(resolve(here, file))).digest("hex");
  if (actual !== expected) errors.push(`${file}: expected ${expected}, got ${actual}`);
}

const worldPath = resolve(here, freeze.world.path);
const world = JSON.parse(await readFile(worldPath, "utf8"));
try {
  const actual = verifyScenarioFreeze(world);
  if (actual !== freeze.world.contentHash) errors.push(`world: expected ${freeze.world.contentHash}, got ${actual}`);
} catch (error) {
  errors.push(`world: ${error.message}`);
}

const validation = validateRichDocument(world);
errors.push(...validation.errors.map((error) => `rich document: ${error}`));
const admission = JSON.parse(await readFile(join(here, "admission-report.json"), "utf8"));
if (admission.world.freezeHash !== freeze.world.contentHash) errors.push("admission report references a different world freeze");
if (admission.admissionDecision?.admittedToRichInterpreterV2 !== true) errors.push("admission decision is not positive for rich v2");
if (admission.admissionDecision?.admittedForCctComparison !== false) errors.push("admission boundary incorrectly claims CCT comparability");

console.log(JSON.stringify({
  valid: errors.length === 0,
  freezeId: freeze.id,
  files: Object.keys(freeze.files ?? {}).length,
  worldFreeze: freeze.world.contentHash,
  errors,
}, null, 2));
process.exitCode = errors.length ? 1 : 0;
