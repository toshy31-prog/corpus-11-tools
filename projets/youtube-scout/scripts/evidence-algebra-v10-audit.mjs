#!/usr/bin/env node
import fs from "node:fs";

const files = [
  "lib/track-resolution.mjs",
  "lib/evidence-algebra.mjs",
  "scripts/live-track-resolution-engine.mjs"
];

console.log("=== EVIDENCE ALGEBRA V10 AUDIT ===");

for (const file of files) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/u);
  console.log(`\n===== ${file} =====`);

  lines.forEach((line, index) => {
    if (
      /probableCreditVariant|sameLooseName|relationBetweenNames|orthographic_variant|credit_name_variant|namesAreNonCompeting/iu.test(line)
    ) {
      console.log(`${String(index + 1).padStart(5)}  ${line}`);
    }
  });
}

const track = fs.readFileSync("lib/track-resolution.mjs", "utf8");

console.log("\n===== INVARIANTS V10 =====");
console.log(JSON.stringify({
  probableCreditVariantRemoved:
    !track.includes("function probableCreditVariant"),
  sameLooseNameRemoved:
    !track.includes("function sameLooseName"),
  centralRelationKernelUsed:
    track.includes("relationBetweenNames("),
  issueProvenancePreserved:
    track.includes('"orthographic_variant"') &&
    track.includes('"credit_name_variant"')
}, null, 2));

console.log("\nREAD ONLY — aucune mutation du graphe.");
