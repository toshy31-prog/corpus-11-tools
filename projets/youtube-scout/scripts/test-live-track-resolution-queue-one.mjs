#!/usr/bin/env node

import fs from "node:fs/promises";

import {
  auditCase,
  readDiscogsToken
} from "./live-track-resolution-engine.mjs";

// The Node test auto-discovery also matches this historical filename.
// Never read personal inputs/credentials or call providers implicitly.
if (!process.argv.includes("--allow-network") || process.env.NODE_TEST_CONTEXT) {
  console.log("SKIP — audit réseau désactivé. Lancer séparément avec --allow-network après accord explicite.");
  process.exit(0);
}

function clean(value = "") {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/gu, " ")
    .trim();
}

const doc =
  JSON.parse(
    await fs.readFile(
      "validation-0.14/resolution-network-queue.json",
      "utf8"
    )
  );

const row =
  doc?.queues?.priority?.[0];

if (!row) {
  throw new Error(
    "Premier item $.queues.priority[0] introuvable."
  );
}

const video = row.video || {};

const preferredNames =
  Array.isArray(row.interpreted?.preferredArtists)
    ? row.interpreted.preferredArtists
    : [];

const competingNames =
  Array.isArray(row.interpreted?.competingArtists)
    ? row.interpreted.competingArtists
    : [];

const issueTypes =
  Array.isArray(row.interpreted?.issueTypes)
    ? row.interpreted.issueTypes
    : [];

const issues = [];

if (
  issueTypes.includes("topic_channel_disagreement") &&
  preferredNames.length &&
  competingNames.length
) {
  issues.push({
    type: "topic_channel_disagreement",
    severity: "info",
    headerCandidates: preferredNames,
    channelCandidate: competingNames[0]
  });
}

if (
  issueTypes.includes("multiple_primary_candidates")
) {
  issues.push({
    type: "multiple_primary_candidates",
    severity: "review",
    candidates: [
      ...preferredNames.map((name) => ({
        name,
        role: "primary",
        sources: ["queue_precomputed"]
      })),
      ...competingNames.map((name) => ({
        name,
        role: "primary",
        sources: ["queue_precomputed_competing"]
      }))
    ]
  });
}

const testCase = {
  id:
    clean(video.videoId || video.id || "queue-test-1"),

  raw: {
    id:
      clean(video.videoId || video.id),
    title:
      clean(video.title),
    channelTitle:
      clean(video.channelTitle),
    description:
      String(video.description || ""),
    durationSeconds:
      video.durationSeconds ?? null,
    publishedAt:
      clean(video.publishedAt)
  },

  priority:
    row.priority || null,

  projection: {
    interpreted: {
      title:
        clean(row.interpreted?.title || video.title),

      preferredArtists:
        preferredNames.map((name) => ({
          name: clean(name),
          role: "primary",
          confidence: 0.94,
          sources: ["queue_precomputed"]
        })),

      secondaryCredits:
        competingNames.map((name) => ({
          name: clean(name),
          role: "channel_hint",
          confidence: 0.68,
          sources: ["queue_precomputed_competing"]
        })),

      version:
        clean(row.interpreted?.version),

      catalogueCode:
        clean(row.interpreted?.catalogueCode),

      identityStatus:
        clean(row.interpreted?.identityStatus || "unresolved"),

      issues
    },

    queries:
      (
        row.searchPlan?.projectedQueries ||
        []
      ).map((query) => ({
        ...query,
        artist: clean(query.artist),
        title: clean(query.title),
        version: clean(query.version),
        catalogueCode: clean(query.catalogueCode)
      }))
  }
};

console.log(
  "===== TEST 1/227 — PROJECTION TRANSMISE ====="
);

console.log(
  JSON.stringify(
    {
      id: testCase.id,
      title:
        testCase.projection.interpreted.title,
      preferredArtists:
        testCase.projection.interpreted
          .preferredArtists
          .map(({ name }) => name),
      competingArtists:
        competingNames,
      issues:
        testCase.projection.interpreted.issues,
      projectedQueries:
        testCase.projection.queries
    },
    null,
    2
  )
);

if (!testCase.projection.queries.length) {
  throw new Error(
    "STOP : projection pré-calculée = 0 requête."
  );
}

const token =
  await readDiscogsToken();

console.log("");
console.log(
  token
    ? "Discogs token: disponible"
    : "Discogs token: absent"
);
console.log(
  "Mode: READ ONLY — 1 seul cas."
);

const result =
  await auditCase(
    testCase,
    token
  );

console.log("");
console.log(
  "===== RESULTAT TEST 1/227 ====="
);

console.log(
  JSON.stringify(
    {
      id: result.id,
      selectedQueries:
        result.projection?.selectedQueries?.length ?? 0,
      providerSearches:
        result.providerSearches?.length ?? 0,
      candidates:
        result.candidates?.length ?? 0,
      decision:
        result.decision?.decision,
      reason:
        result.decision?.reason,
      gap:
        result.decision?.gap
    },
    null,
    2
  )
);

if (
  (result.projection?.selectedQueries?.length ?? 0) === 0
) {
  throw new Error(
    "ECHEC : moteur = encore 0 requête."
  );
}

console.log("");
console.log(
  "OK — bug 0-query corrigé sur le premier cas."
);
console.log(
  "STOP volontaire avant les 226 autres."
);
console.log(
  "Aucune mutation du graphe Scout effectuée."
);
