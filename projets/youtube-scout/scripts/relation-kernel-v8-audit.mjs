#!/usr/bin/env node
import fs from "node:fs";

const files = [
  "lib/track-resolution.mjs",
  "lib/resolution-evidence.mjs",
  "lib/track-candidate-score.mjs",
  "lib/multisource-decision.mjs",
  "scripts/live-track-resolution-engine.mjs"
];

console.log("=== RELATION KERNEL V8 AUDIT ===");

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/u);
  console.log(`\n===== ${file} =====`);
  lines.forEach((line, i) => {
    if (/orthographic_variant|credit_name_variant|nonCompetingVariants|namesAreNonCompeting|probableCreditVariant/iu.test(line)) {
      console.log(`${String(i + 1).padStart(5)}  ${line}`);
    }
  });
}

console.log("\nREAD ONLY — inventaire des duplications restantes.");
