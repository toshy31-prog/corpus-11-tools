#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const files = [
  "lib/track-resolution.mjs",
  "lib/resolution-evidence.mjs",
  "lib/track-candidate-score.mjs",
  "lib/multisource-decision.mjs",
  "scripts/live-track-resolution-engine.mjs"
];

const needles = [
  "identity",
  "variant",
  "alias",
  "contradiction",
  "competing",
  "corrobor",
  "additional_artist",
  "channel_hint",
  "featured",
  "remixer",
  "known_identity"
];

console.log(
  "=== EVIDENCE ALGEBRA MIGRATION AUDIT ==="
);

for (const file of files) {
  if (!fs.existsSync(file)) continue;

  const lines =
    fs.readFileSync(
      file,
      "utf8"
    ).split(/\r?\n/u);

  console.log("");
  console.log(
    `===== ${file} =====`
  );

  for (
    let i = 0;
    i < lines.length;
    i++
  ) {
    const low =
      lines[i].toLowerCase();

    if (
      needles.some(
        (needle) =>
          low.includes(needle)
      )
    ) {
      console.log(
        `${String(i + 1).padStart(5)}  ${lines[i]}`
      );
    }
  }
}

console.log("");
console.log(
  "READ ONLY — ce rapport sert à repérer les règles à migrer progressivement vers lib/evidence-algebra.mjs."
);
