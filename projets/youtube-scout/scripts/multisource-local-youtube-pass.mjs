#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

import {
  collectYouTubeLocalEvidence
} from "../lib/youtube-resolution-evidence.mjs";

import {
  decideMultiSourceIdentity
} from "../lib/multisource-decision.mjs";

function clean(value = "") {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/gu, " ")
    .trim();
}

function nameOf(value) {
  if (typeof value === "string") {
    return clean(value);
  }

  if (value && typeof value === "object") {
    return clean(
      value.name ||
      value.artist ||
      value.label ||
      ""
    );
  }

  return "";
}

function uniqueNames(values = []) {
  const seen = new Set();
  const result = [];

  for (const value of values) {
    const name = nameOf(value);
    const key =
      name
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/gu, "")
        .toLocaleLowerCase();

    if (!name || seen.has(key)) continue;

    seen.add(key);
    result.push(name);
  }

  return result;
}

function videoIdOfResultRow(row = {}) {
  return clean(
    row.caseId ||
    row.result?.id ||
    row.id ||
    ""
  );
}

function resultDecision(row = {}) {
  return (
    row.result?.decision ||
    row.decision ||
    {}
  );
}

function interpretedOf(row = {}) {
  return (
    row.result?.projection?.interpreted ||
    row.projection?.interpreted ||
    {}
  );
}

function rankedRows(row = {}) {
  const decision =
    resultDecision(row);

  return Array.isArray(decision.ranked)
    ? decision.ranked
    : [];
}

function exactNameMatch(a, b) {
  const normalize = (v) =>
    clean(v)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/gu, "")
      .toLocaleLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();

  return (
    normalize(a) &&
    normalize(a) === normalize(b)
  );
}

function providerEvidencePackets(
  row,
  expectedArtists,
  competingArtists
) {
  const allowed =
    [
      ...expectedArtists,
      ...competingArtists
    ];

  const byProvider =
    new Map();

  for (const ranked of rankedRows(row)) {
    const candidate =
      ranked.candidate ||
      ranked;

    const source =
      clean(
        candidate.source ||
        ranked.source
      );

    if (
      source !== "musicbrainz" &&
      source !== "discogs"
    ) {
      continue;
    }

    const score =
      Number(
        ranked.score ??
        candidate.score ??
        0
      );

    /*
     * On reste volontairement conservateur :
     * seuls les candidats déjà très forts du moteur précédent
     * deviennent une preuve d'identité pour la fusion multi-source.
     */
    if (score < 0.85) continue;

    const artists =
      uniqueNames(
        candidate.artists ||
        ranked.artists ||
        []
      );

    for (const artist of artists) {
      if (
        allowed.length &&
        !allowed.some(
          (known) =>
            exactNameMatch(
              artist,
              known
            )
        )
      ) {
        continue;
      }

      if (!byProvider.has(source)) {
        byProvider.set(source, []);
      }

      byProvider.get(source).push({
        kind: "artist",
        value: artist,
        role: "provider_candidate",
        source:
          `${source}_candidate`,
        strength:
          Math.min(
            1,
            Math.max(
              0,
              score
            )
          )
      });
    }
  }

  return [
    ...byProvider.entries()
  ].map(
    ([source, observations]) => ({
      source,
      observations,
      candidates: [],
      diagnostics: {
        derivedFrom:
          "live-track-resolution-queue-results",
        threshold: 0.85
      }
    })
  );
}

const backupPath =
  path.resolve(
    process.argv[2] ||
    "/home/olivier/Téléchargements/youtube-scout-sauvegarde-2026-09-13(1).json"
  );

const resultsPath =
  path.resolve(
    process.argv[3] ||
    "validation-0.14/live-track-resolution-queue-results.json"
  );

const outputPath =
  path.resolve(
    "validation-0.14/multisource-local-youtube-pass.json"
  );

const backup =
  JSON.parse(
    fs.readFileSync(
      backupPath,
      "utf8"
    )
  );

const previous =
  JSON.parse(
    fs.readFileSync(
      resultsPath,
      "utf8"
    )
  );

if (!Array.isArray(backup.library)) {
  throw new Error(
    "Backup invalide : library manquant."
  );
}

if (!Array.isArray(previous.results)) {
  throw new Error(
    "Rapport invalide : results manquant."
  );
}

const libraryById =
  new Map(
    backup.library.map(
      (item) => [
        clean(
          item.id ||
          item.videoId
        ),
        item
      ]
    )
  );

const rows = [];

for (const row of previous.results) {
  const priorDecision =
    resultDecision(row);

  const priorStatus =
    clean(
      priorDecision.decision
    );

  /*
   * Les auto_accept MB/Discogs sont déjà acquis pour cette passe.
   * On ne réouvre que tout le reste.
   */
  if (
    priorStatus === "auto_accept" ||
    priorStatus === "accepted"
  ) {
    continue;
  }

  const id =
    videoIdOfResultRow(row);

  const fullVideo =
    libraryById.get(id);

  const interpreted =
    interpretedOf(row);

  const expectedArtists =
    uniqueNames(
      interpreted.preferredArtists ||
      []
    );

  const competingArtists =
    uniqueNames(
      [
        ...(row.result?.projection
          ?.competingArtists || []),
        ...(interpreted.competingArtists || [])
      ]
    );

  if (!fullVideo) {
    rows.push({
      id,
      previousDecision:
        priorStatus || "unknown",
      previousReason:
        clean(
          priorDecision.reason
        ),
      foundInBackup: false,
      decision: {
        decision: "deferred",
        reason:
          "video_missing_from_reference_backup"
      }
    });

    continue;
  }

  const youtubePacket =
    collectYouTubeLocalEvidence(
      fullVideo
    );

  const providerPackets =
    providerEvidencePackets(
      row,
      expectedArtists,
      competingArtists
    );

  const evidencePackets =
    [
      youtubePacket,
      ...providerPackets
    ];

  const decision =
    decideMultiSourceIdentity({
      expectedArtists,
      competingArtists,
      evidencePackets,
      minimumIndependentSources: 2,
      strongSingleSourceThreshold: 0.97
    });

  rows.push({
    id,
    video: {
      title:
        clean(fullVideo.title),
      channelTitle:
        clean(fullVideo.channelTitle),
      hasDescription:
        Boolean(
          clean(
            fullVideo.description
          )
        )
    },
    previous: {
      decision:
        priorStatus || "unknown",
      reason:
        clean(
          priorDecision.reason
        )
    },
    expectedArtists,
    competingArtists,
    evidencePackets,
    decision
  });
}

const counts = {};

for (const row of rows) {
  const key =
    `${row.decision?.decision || "unknown"}:${row.decision?.reason || "unknown"}`;

  counts[key] =
    (counts[key] || 0) + 1;
}

const accepted =
  rows.filter(
    (row) =>
      row.decision?.decision ===
      "accepted"
  );

const ambiguous =
  rows.filter(
    (row) =>
      row.decision?.decision ===
      "ambiguous"
  );

const deferred =
  rows.filter(
    (row) =>
      row.decision?.decision ===
      "deferred"
  );

const rejected =
  rows.filter(
    (row) =>
      row.decision?.decision ===
      "rejected"
  );

const report = {
  generatedAt:
    new Date().toISOString(),
  mode: "READ_ONLY",
  mutations: false,
  source: {
    backup: backupPath,
    previousResults:
      resultsPath
  },
  summary: {
    previousEscalated:
      rows.length,
    accepted:
      accepted.length,
    ambiguous:
      ambiguous.length,
    deferred:
      deferred.length,
    rejected:
      rejected.length,
    counts
  },
  rows
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

console.log(
  "=== MULTISOURCE LOCAL YOUTUBE PASS ==="
);

console.log(
  `Réévalués          : ${rows.length}`
);

console.log(
  `Acceptés           : ${accepted.length}`
);

console.log(
  `Ambigus            : ${ambiguous.length}`
);

console.log(
  `Différés           : ${deferred.length}`
);

console.log(
  `Rejetés            : ${rejected.length}`
);

console.log("");
console.log("Répartition :");

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
  "Exemples acceptés :"
);

for (const row of accepted.slice(0, 20)) {
  console.log(
    JSON.stringify({
      id: row.id,
      title:
        row.video?.title,
      expectedArtists:
        row.expectedArtists,
      previous:
        row.previous,
      decision:
        row.decision
    })
  );
}

console.log("");
console.log(
  `Rapport : ${outputPath}`
);

console.log(
  "Aucune mutation du graphe Scout effectuée."
);
