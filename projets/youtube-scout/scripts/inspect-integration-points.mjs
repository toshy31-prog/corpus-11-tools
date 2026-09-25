#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(".");

const files = [
  "scripts/live-track-resolution-engine.mjs",
  "lib/resolution-evidence.mjs",
  "lib/track-resolution.mjs",
  "lib/track-search-projection.mjs",
  "lib/scout.mjs",
  "server.mjs"
];

const patterns = [
  /auditCase/gu,
  /buildTrackSearchProjection/gu,
  /decideTrackCandidate/gu,
  /buildResolutionEvidence/gu,
  /resolveTrack/gu,
  /musicbrainz/giu,
  /discogs/giu,
  /youtube/giu
];

for (const rel of files) {
  const abs = path.join(root, rel);

  if (!fs.existsSync(abs)) continue;

  const lines =
    fs.readFileSync(abs, "utf8")
      .split(/\r?\n/u);

  console.log("");
  console.log("========================================");
  console.log(rel);
  console.log("========================================");

  for (
    let i = 0;
    i < lines.length;
    i++
  ) {
    if (
      patterns.some(
        (pattern) => {
          pattern.lastIndex = 0;
          return pattern.test(lines[i]);
        }
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
  "READ ONLY — aucune modification effectuée."
);
