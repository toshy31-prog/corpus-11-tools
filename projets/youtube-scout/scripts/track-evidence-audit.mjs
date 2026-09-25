import fs from "node:fs";
import path from "node:path";

import {
  inferTrackStructure
} from "../lib/track-evidence.mjs";

const input = process.argv[2];

if (!input) {
  console.error(
    "Usage: node scripts/track-evidence-audit.mjs backup.json"
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

const counts = {
  total: 0,
  structured: 0,
  partial: 0,
  unresolved: 0,

  topic: 0,
  topicStructured: 0,
  nonTopic: 0,
  nonTopicStructured: 0,

  withPrimary: 0,
  withFeaturing: 0,
  withRemixer: 0,

  conflicts: 0
};

const samples = {
  unresolved: [],
  partial: [],
  conflicts: []
};

function comparisonKey(value = "") {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function keep(bucket, item, result, max = 50) {
  if (samples[bucket].length >= max) return;

  samples[bucket].push({
    id: item.id,
    title: item.title,
    channelTitle: item.channelTitle,
    status: result.status,
    titleResolved: result.title,
    artists: result.artists
  });
}

for (const item of backup.library) {
  counts.total++;

  const topic =
    /\s-\sTopic$/iu.test(
      String(item.channelTitle || "")
    );

  if (topic) counts.topic++;
  else counts.nonTopic++;

  const result = inferTrackStructure(item);

  counts[result.status]++;

  if (topic && result.status === "structured") {
    counts.topicStructured++;
  }

  if (!topic && result.status === "structured") {
    counts.nonTopicStructured++;
  }

  if (
    result.artists.some(
      ({ role }) =>
        role === "primary" ||
        role === "joint"
    )
  ) {
    counts.withPrimary++;
  }

  if (
    result.artists.some(
      ({ role }) => role === "featuring"
    )
  ) {
    counts.withFeaturing++;
  }

  if (
    result.artists.some(
      ({ role }) => role === "remixer"
    )
  ) {
    counts.withRemixer++;
  }

  /*
   * Détection simple d'un conflit intéressant :
   * plusieurs artistes "primary" de forte confiance
   * portant des noms distincts.
   */
  const strongPrimary = result.artists
    .filter(
      ({ role, confidence }) =>
        role === "primary" &&
        confidence >= 0.8
    )
    .map(({ name }) => comparisonKey(name));

  if (new Set(strongPrimary).size > 1) {
    counts.conflicts++;
    keep("conflicts", item, result);
  }

  if (result.status === "partial") {
    keep("partial", item, result);
  }

  if (result.status === "unresolved") {
    keep("unresolved", item, result);
  }
}

const pct = (value, denominator = counts.total) =>
  denominator
    ? Number(
        ((value / denominator) * 100).toFixed(2)
      )
    : 0;

const report = {
  source: absolute,

  counts,

  percentages: {
    structured: pct(counts.structured),
    partial: pct(counts.partial),
    unresolved: pct(counts.unresolved),

    topicStructured: pct(
      counts.topicStructured,
      counts.topic
    ),

    nonTopicStructured: pct(
      counts.nonTopicStructured,
      counts.nonTopic
    )
  },

  samples
};

const output =
  path.resolve(
    "validation-0.14/track-evidence-audit.json"
  );

fs.mkdirSync(path.dirname(output), {
  recursive: true
});

fs.writeFileSync(
  output,
  JSON.stringify(report, null, 2) + "\n"
);

console.log("");
console.log(
  "=== TRACK EVIDENCE AUDIT ==="
);
console.log(
  `Total                 : ${counts.total}`
);
console.log(
  `Structurés            : ${counts.structured} (${pct(counts.structured)}%)`
);
console.log(
  `Partiels              : ${counts.partial} (${pct(counts.partial)}%)`
);
console.log(
  `Non résolus           : ${counts.unresolved} (${pct(counts.unresolved)}%)`
);
console.log("");
console.log(
  `Topic                 : ${counts.topic}`
);
console.log(
  `Topic structurés      : ${counts.topicStructured} (${pct(counts.topicStructured, counts.topic)}%)`
);
console.log(
  `Non-Topic structurés  : ${counts.nonTopicStructured} (${pct(counts.nonTopicStructured, counts.nonTopic)}%)`
);
console.log("");
console.log(
  `Avec artiste principal: ${counts.withPrimary}`
);
console.log(
  `Avec featuring        : ${counts.withFeaturing}`
);
console.log(
  `Avec remixer          : ${counts.withRemixer}`
);
console.log(
  `Conflits forts        : ${counts.conflicts}`
);
console.log("");
console.log(`Rapport : ${output}`);
