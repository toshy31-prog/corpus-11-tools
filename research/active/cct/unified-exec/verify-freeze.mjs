#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateUnifiedSpec } from "./runtime.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const freeze = JSON.parse(await readFile(join(here, "freeze.json"), "utf8"));
const errors = [];
for (const [file, expected] of Object.entries(freeze.files ?? {})) {
  const actual = createHash("sha256").update(await readFile(resolve(here, file))).digest("hex");
  if (actual !== expected) errors.push(`${file}: expected ${expected}, got ${actual}`);
}
for (const relative of freeze.basisFreezes ?? []) {
  try { JSON.parse(await readFile(resolve(here, relative), "utf8")); }
  catch { errors.push(`basis freeze missing or invalid: ${relative}`); }
}
const specErrors = validateUnifiedSpec(JSON.parse(await readFile(join(here, "spec.json"), "utf8")));
errors.push(...specErrors.map((error) => `spec: ${error}`));
console.log(JSON.stringify({ valid: errors.length === 0, freezeId: freeze.id, files: Object.keys(freeze.files ?? {}).length, errors }, null, 2));
process.exitCode = errors.length ? 1 : 0;
