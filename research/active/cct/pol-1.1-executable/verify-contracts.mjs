#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const contracts = [
  ".",
  "cct-sky",
  "minimum-use-case-water-continuity",
  "pre-adoption",
  "resource-vehicle"
];

for (const contract of contracts) {
  const prefix = contract === "." ? "" : `${contract}/`;
  for (const args of [[`${prefix}validate.mjs`], ["--test", `${prefix}test.mjs`]]) {
    const result = spawnSync(process.execPath, args, { cwd: root, stdio: "inherit" });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
}

for (const args of [
  ["arena/validate-arena.mjs"],
  ["--test", "arena/test-arena.mjs"],
  ["arena/validate-worlds.mjs"],
  ["--test", "arena/test-worlds.mjs"],
  ["--test", "arena/test-external-submission.mjs"]
]) {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("CCT-POL 1.1 local contracts and adversarial arena verification passed.");
