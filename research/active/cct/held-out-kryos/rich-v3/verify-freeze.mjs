#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyScenarioFreeze } from "../../../../../corpus-11-tools/labs/experiment-lab/arena/declarative/hash.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const freeze = JSON.parse(await readFile(resolve(here, "freeze.json"), "utf8"));
const errors = [];
for (const [file, expected] of Object.entries(freeze.files)) {
  const actual = createHash("sha256").update(await readFile(resolve(here, file))).digest("hex");
  if (actual !== expected) errors.push(`${file}: expected ${expected}, got ${actual}`);
}
const worldBytes = await readFile(resolve(here, freeze.world.path));
const worldFileHash = createHash("sha256").update(worldBytes).digest("hex");
if (worldFileHash !== freeze.world.fileHash) errors.push("world file hash mismatch");
const world = JSON.parse(worldBytes);
try {
  const contentHash = verifyScenarioFreeze(world);
  if (contentHash !== freeze.world.contentHash) errors.push("world content hash mismatch");
} catch (error) { errors.push(error.message); }
console.log(JSON.stringify({ valid: errors.length === 0, freezeId: freeze.id, errors }, null, 2));
process.exitCode = errors.length ? 1 : 0;
