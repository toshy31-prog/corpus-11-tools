import fs from "node:fs";
import path from "node:path";

import {
  buildTrackSearchProjection
} from "../lib/track-search-projection.mjs";

const input = process.argv[2];

if (!input) {
  console.error(
    "Usage: node scripts/review-metadata-audit.mjs backup.json"
  );
  process.exit(2);
}

const absolute = path.resolve(input);

const backup = JSON.parse(
  fs.readFileSync(absolute, "utf8")
);

if (!Array.isArray(backup.library)) {
  throw new Error(
    "Le JSON ne contient pas de tableau library"
  );
}

function clean(value = "") {
  return String(value)
    .replace(/\r/gu, "")
    .trim();
}

function interestingDescriptionLines(description = "") {
  const structuredField =
    /^(?:main\s+artist|primary\s+artist|artist|featured\s+artist|featuring\s+artist|remixer|composer|producer|performer|writer|music\s+publisher)\s*:/iu;

  return clean(description)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter(
      (line) =>
        structuredField.test(line) ||
        line.includes("·")
    )
    .slice(0, 40);
}

const rows = [];

for (const item of backup.library) {
  const projection =
    buildTrackSearchProjection(item);

  const reviewIssues =
    (projection.interpreted.issues || [])
      .filter(
        ({ severity }) => severity === "review"
      );

  if (!reviewIssues.length) continue;

  rows.push({
    id: item.id || null,
    title: item.title || "",
    channelTitle: item.channelTitle || "",

    reviewIssues,

    rawMetadataLines:
      interestingDescriptionLines(
        item.description || ""
      ),

    interpreted:
      projection.interpreted,

    topQueries:
      projection.queries.slice(0, 6)
  });
}

const report = {
  source: absolute,
  count: rows.length,
  rows
};

const output =
  path.resolve(
    "validation-0.14/review-metadata-audit.json"
  );

fs.mkdirSync(
  path.dirname(output),
  { recursive: true }
);

fs.writeFileSync(
  output,
  JSON.stringify(report, null, 2) + "\n"
);

console.log(
  `Reviews extraits : ${rows.length}`
);

console.log(
  `Rapport : ${output}`
);

for (const row of rows) {
  console.log("");
  console.log("==================================================");
  console.log(`TITLE   : ${row.title}`);
  console.log(`CHANNEL : ${row.channelTitle}`);

  console.log("");
  console.log("RAW METADATA:");

  if (!row.rawMetadataLines.length) {
    console.log("  (aucune ligne structurée détectée)");
  } else {
    for (const line of row.rawMetadataLines) {
      console.log(`  ${line}`);
    }
  }

  console.log("");
  console.log("INTERPRETED ARTISTS:");

  for (
    const artist of
    row.interpreted.preferredArtists || []
  ) {
    console.log(
      `  preferred ${artist.name} :: ${artist.role} :: ${artist.sources}`
    );
  }

  for (
    const artist of
    row.interpreted.secondaryCredits || []
  ) {
    console.log(
      `  secondary ${artist.name} :: ${artist.role} :: ${artist.sources}`
    );
  }

  console.log("");
  console.log(
    `ISSUES: ${JSON.stringify(row.reviewIssues)}`
  );
}
