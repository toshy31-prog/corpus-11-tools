#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const input =
  process.argv[2];

if (!input) {
  console.error(
    "Usage: node scripts/multisource-priority-audit.mjs live-track-resolution-queue-results.json"
  );
  process.exit(2);
}

const doc =
  JSON.parse(
    fs.readFileSync(
      path.resolve(input),
      "utf8"
    )
  );

const results =
  Array.isArray(doc.results)
    ? doc.results
    : [];

const rows =
  results.map((row) => {
    const result =
      row.result || row;

    const decision =
      result?.decision?.decision ||
      "unknown";

    const reason =
      result?.decision?.reason ||
      "unknown";

    const selectedQueries =
      result?.projection
        ?.selectedQueries?.length ||
      0;

    const providerSearches =
      result?.providerSearches?.length ||
      0;

    const candidates =
      result?.candidates?.length ||
      0;

    return {
      id:
        row.caseId ||
        result.id ||
        "",
      priority:
        row.priority ||
        null,
      decision,
      reason,
      selectedQueries,
      providerSearches,
      candidates,
      shouldEscalate:
        (
          decision !== "auto_accept" &&
          decision !== "accepted"
        )
    };
  });

const counts = {};

for (const row of rows) {
  const key =
    `${row.decision}:${row.reason}`;

  counts[key] =
    (counts[key] || 0) + 1;
}

const escalate =
  rows.filter(
    ({ shouldEscalate }) =>
      shouldEscalate
  );

console.log(
  "=== MULTISOURCE PRIORITY AUDIT ==="
);

console.log(
  `Total : ${rows.length}`
);

console.log(
  `À escalader après MB/Discogs : ${escalate.length}`
);

console.log("");
console.log("Décisions :");

for (
  const [key, count] of
  Object.entries(counts)
    .sort(
      (a, b) =>
        b[1] - a[1]
    )
) {
  console.log(
    `${String(count).padStart(4)}  ${key}`
  );
}

console.log("");
console.log(
  "Premiers cas à escalader :"
);

for (const row of escalate.slice(0, 40)) {
  console.log(
    JSON.stringify(row)
  );
}

const output =
  path.resolve(
    "validation-0.14/multisource-priority-audit.json"
  );

fs.writeFileSync(
  output,
  JSON.stringify(
    {
      generatedAt:
        new Date().toISOString(),
      mode: "READ_ONLY",
      mutations: false,
      total:
        rows.length,
      escalated:
        escalate.length,
      counts,
      rows
    },
    null,
    2
  ) + "\n"
);

console.log("");
console.log(`Rapport : ${output}`);
console.log(
  "Aucune mutation du graphe effectuée."
);
