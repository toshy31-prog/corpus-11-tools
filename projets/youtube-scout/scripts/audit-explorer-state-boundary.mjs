#!/usr/bin/env node
import fs from "node:fs";

const source = fs.readFileSync("public/app.js", "utf8");

const checks = {
  resumableSlotPresent:
    source.includes("let resumableDig = null;"),

  oldTimestampLaunderingRemoved:
    !source.includes(
      'const restoredDig = { ...(payload.local.activeDig || {}), updatedAt: new Date().toISOString() };'
    ),

  activeCanBeCleared:
    source.includes("explorationSession = null;"),

  activeSeedNullable:
    /seed:\s*null/u.test(source)
};

console.log("=== EXPLORER STATE BOUNDARY AUDIT ===");
console.log(JSON.stringify(checks, null, 2));

const failed = Object.entries(checks).filter(([, value]) => !value);

if (failed.length) {
  console.log("\nSTATUS: NOT READY");
  process.exitCode = 1;
} else {
  console.log("\nSTATUS: READY FOR UI SMOKE TEST");
}

console.log("No graph mutation performed.");
