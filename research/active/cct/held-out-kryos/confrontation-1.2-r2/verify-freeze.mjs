#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const freeze = JSON.parse(await readFile(resolve(here, "freeze.json"), "utf8"));
const errors = [];
for (const [file, expected] of Object.entries(freeze.files)) {
  const actual = createHash("sha256").update(await readFile(resolve(here, file))).digest("hex");
  if (actual !== expected) errors.push(`${file}: expected ${expected}, got ${actual}`);
}
const controlHash = createHash("sha256").update(await readFile(resolve(here, freeze.retainedControlFailure.path))).digest("hex");
if (controlHash !== freeze.retainedControlFailure.hash) errors.push("retained R1 control failure hash mismatch");
console.log(JSON.stringify({ valid: errors.length === 0, freezeId: freeze.id, errors }, null, 2));
process.exitCode = errors.length ? 1 : 0;
