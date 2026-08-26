#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const freeze = JSON.parse(await readFile(join(here, "v0.14-freeze.json"), "utf8"));
const errors = [];
for (const [file, expected] of Object.entries(freeze.files ?? {})) {
  const actual = createHash("sha256").update(await readFile(join(here, file))).digest("hex");
  if (actual !== expected) errors.push(`${file}: expected ${expected}, got ${actual}`);
}
console.log(JSON.stringify({ valid: errors.length === 0, freezeId: freeze.id, files: Object.keys(freeze.files ?? {}).length, errors }, null, 2));
process.exitCode = errors.length ? 1 : 0;
