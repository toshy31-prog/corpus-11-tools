#!/usr/bin/env node
import fs from "node:fs";

const files = [
  "lib/track-resolution.mjs",
  "scripts/live-track-resolution-engine.mjs"
];

console.log("=== EVIDENCE ALGEBRA V9 AUDIT ===");

for (const file of files) {
  const lines =
    fs.readFileSync(file, "utf8")
      .split(/\r?\n/u);

  console.log(`\n===== ${file} =====`);

  lines.forEach((line, index) => {
    if (
      /nonCompetingVariants|namesAreNonCompeting|orthographic_variant|credit_name_variant|probableCreditVariant/iu.test(line)
    ) {
      console.log(
        `${String(index + 1).padStart(5)}  ${line}`
      );
    }
  });
}

const liveSource =
  fs.readFileSync(
    "scripts/live-track-resolution-engine.mjs",
    "utf8"
  );

console.log("\n===== INVARIANTS V9 =====");
console.log(
  JSON.stringify(
    {
      nonCompetingVariantsAuthorityRemoved:
        !liveSource.includes(
          "const nonCompetingVariants"
        ),
      centralRelationKernelUsed:
        liveSource.includes(
          "namesAreNonCompeting("
        ),
      variantSearchProvenancePreserved:
        liveSource.includes(
          "function searchArtistVariantsFromProjection("
        )
    },
    null,
    2
  )
);

console.log("\nREAD ONLY — aucune mutation du graphe.");
