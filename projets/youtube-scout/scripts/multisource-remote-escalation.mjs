#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

import {
  decideMultiSourceIdentity
} from "../lib/multisource-decision.mjs";

import {
  fetchYouTubeOEmbed,
  fetchYouTubeWatchMetadata
} from "../lib/remote-youtube-evidence.mjs";

function clean(value = "") {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/gu, " ")
    .trim();
}

const backupPath =
  path.resolve(process.argv[2] || "");

const oldResultsPath =
  path.resolve(process.argv[3] || "");

const localPassPath =
  path.resolve(process.argv[4] || "");

if (!backupPath || !oldResultsPath || !localPassPath) {
  console.error(`
Usage:
  node scripts/multisource-remote-escalation.mjs \
    backup.json \
    live-track-resolution-queue-results.json \
    multisource-local-youtube-pass.json
`);
  process.exit(2);
}

const outputPath =
  path.resolve(
    "validation-0.14/multisource-remote-escalation.json"
  );

const checkpointPath =
  path.resolve(
    "validation-0.14/multisource-remote-escalation-checkpoint.json"
  );

const backup =
  JSON.parse(
    fs.readFileSync(
      backupPath,
      "utf8"
    )
  );

const localPass =
  JSON.parse(
    fs.readFileSync(
      localPassPath,
      "utf8"
    )
  );

const libraryById =
  new Map(
    (backup.library || []).map(
      (item) => [
        clean(
          item.id ||
          item.videoId
        ),
        item
      ]
    )
  );

const previousRows =
  Array.isArray(localPass.rows)
    ? localPass.rows
    : [];

const targets =
  previousRows.filter(
    (row) =>
      row.decision?.decision !==
      "accepted"
  );

let state = {
  mode: "READ_ONLY",
  mutations: false,
  results: []
};

try {
  const loaded =
    JSON.parse(
      fs.readFileSync(
        checkpointPath,
        "utf8"
      )
    );

  if (
    loaded &&
    Array.isArray(loaded.results)
  ) {
    state = loaded;
  }
} catch {}

const done =
  new Set(
    state.results.map(
      (row) => row.id
    )
  );

console.log(
  "=== MULTISOURCE REMOTE ESCALATION ==="
);

console.log(
  `Cibles : ${targets.length}`
);

console.log(
  `Déjà terminées : ${done.size}`
);

console.log(
  "Mode : READ ONLY"
);

let index = 0;

for (const row of targets) {
  index++;

  const id =
    clean(row.id);

  if (done.has(id)) {
    continue;
  }

  const video =
    libraryById.get(id) ||
    row.video ||
    {};

  console.log("");
  console.log(
    `[${index}/${targets.length}] ${id} — ${clean(video.title)}`
  );

  const priorPackets =
    Array.isArray(
      row.evidencePackets
    )
      ? row.evidencePackets
      : [];

  const remotePackets = [];

  const oembed =
    await fetchYouTubeOEmbed(
      id
    );

  remotePackets.push(oembed);

  /*
   * Si oEmbed ne suffit pas, on lit aussi la page watch.
   * Les deux sont enregistrés séparément mais restent de la
   * même famille de source : YouTube.
   *
   * Pour éviter de simuler artificiellement deux sources
   * indépendantes, la décision ci-dessous les fusionne sous
   * "youtube_remote".
   */
  const watch =
    await fetchYouTubeWatchMetadata(
      id
    );

  remotePackets.push(watch);

  const mergedRemote = {
    source: "youtube_remote",
    observations:
      remotePackets.flatMap(
        (packet) =>
          packet.observations || []
      ),
    diagnostics: {
      oembed:
        oembed.diagnostics,
      watch:
        watch.diagnostics
    },
    ok:
      remotePackets.some(
        (packet) => packet.ok
      )
  };

  const expectedArtists =
    Array.isArray(
      row.expectedArtists
    )
      ? row.expectedArtists
      : [];

  const competingArtists =
    Array.isArray(
      row.competingArtists
    )
      ? row.competingArtists
      : [];

  const decision =
    decideMultiSourceIdentity({
      expectedArtists,
      competingArtists,
      evidencePackets: [
        ...priorPackets,
        mergedRemote
      ],
      minimumIndependentSources: 2,
      strongSingleSourceThreshold: 0.97
    });

  const result = {
    id,
    title:
      clean(video.title),
    previousDecision:
      row.decision,
    remotePackets,
    mergedRemote,
    decision
  };

  state.results.push(
    result
  );

  fs.writeFileSync(
    checkpointPath,
    JSON.stringify(
      {
        ...state,
        updatedAt:
          new Date().toISOString()
      },
      null,
      2
    ) + "\n",
    "utf8"
  );

  console.log(
    `decision: ${decision.decision}`
  );

  console.log(
    `reason: ${decision.reason}`
  );

  /*
   * Petite temporisation pour rester poli envers YouTube.
   */
  await new Promise(
    (resolve) =>
      setTimeout(resolve, 350)
  );
}

const counts = {};

for (const row of state.results) {
  const key =
    `${row.decision?.decision || "unknown"}:${row.decision?.reason || "unknown"}`;

  counts[key] =
    (counts[key] || 0) + 1;
}

const report = {
  ...state,
  generatedAt:
    new Date().toISOString(),
  summary: {
    targetCount:
      targets.length,
    completed:
      state.results.length,
    pending:
      Math.max(
        0,
        targets.length -
        state.results.length
      ),
    counts
  }
};

fs.writeFileSync(
  outputPath,
  JSON.stringify(
    report,
    null,
    2
  ) + "\n",
  "utf8"
);

console.log("");
console.log(
  "===== RESUME FINAL ====="
);

console.log(
  JSON.stringify(
    report.summary,
    null,
    2
  )
);

console.log("");
console.log(
  `Rapport : ${outputPath}`
);

console.log(
  "Aucune mutation du graphe Scout effectuée."
);
