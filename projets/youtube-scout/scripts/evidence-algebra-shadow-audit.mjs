#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

import {
  resolveTrack
} from "../lib/track-resolution.mjs";

import {
  summarizeEvidence,
  relationBetweenNames,
  RELATIONS
} from "../lib/evidence-algebra.mjs";

import {
  factsFromTrackResolution
} from "../lib/evidence-algebra-shadow-bridge.mjs";

function clean(value = "") {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/gu, " ")
    .trim();
}

function names(values = []) {
  return values
    .map(
      (value) =>
        clean(
          value?.name ||
          value
        )
    )
    .filter(Boolean);
}

function normalize(value = "") {
  return clean(value)
    .normalize("NFKD")
    .replace(
      /[\u0300-\u036f]/gu,
      ""
    )
    .toLocaleLowerCase()
    .replace(
      /[^\p{L}\p{N}]+/gu,
      " "
    )
    .trim();
}

function setEq(a = [], b = []) {
  const A =
    [...new Set(a.map(normalize))]
      .sort();
  const B =
    [...new Set(b.map(normalize))]
      .sort();

  return (
    JSON.stringify(A) ===
    JSON.stringify(B)
  );
}

const backupPath =
  path.resolve(
    process.argv[2] ||
    "/home/olivier/Téléchargements/youtube-scout-sauvegarde-2026-09-13(1).json"
  );

const outputPath =
  path.resolve(
    "validation-0.14/evidence-algebra-shadow-audit.json"
  );

const backup =
  JSON.parse(
    fs.readFileSync(
      backupPath,
      "utf8"
    )
  );

if (!Array.isArray(backup.library)) {
  throw new Error(
    "Backup sans library."
  );
}

const rows = [];

for (const item of backup.library) {
  const resolution =
    resolveTrack(item);

  const facts =
    factsFromTrackResolution(
      resolution
    );

  const algebra =
    summarizeEvidence(
      facts
    );

  const currentPreferred =
    names(
      resolution.preferredArtists
    );

  const algebraPreferred =
    algebra.identityClusters
      .map(
        (cluster) =>
          cluster.canonical
      );

  const currentVariants =
    (resolution.issues || [])
      .filter(
        (issue) =>
          issue.type ===
            "orthographic_variant" ||
          issue.type ===
            "credit_name_variant"
      );

  const divergence = {
    preferredSet:
      !setEq(
        currentPreferred,
        algebraPreferred
      ),

    expectedVariantButCompeting:
      false
  };

  for (const issue of currentVariants) {
    const candidates =
      names(
        issue.candidates ||
        issue.values ||
        []
      );

    if (candidates.length < 2) {
      continue;
    }

    const relation =
      relationBetweenNames(
        candidates[0],
        candidates[1]
      );

    if (
      relation ===
      RELATIONS.COMPETING_IDENTITY
    ) {
      divergence.expectedVariantButCompeting =
        true;
      break;
    }
  }

  rows.push({
    id:
      clean(
        item.id ||
        item.videoId
      ),
    title:
      clean(item.title),
    channelTitle:
      clean(item.channelTitle),

    current: {
      preferredArtists:
        currentPreferred,
      secondaryCredits:
        names(
          resolution.secondaryCredits
        ),
      issueTypes:
        (resolution.issues || [])
          .map(
            ({ type }) => type
          )
    },

    algebra: {
      identityClusters:
        algebra.identityClusters,
      credits:
        algebra.credits.map(
          (fact) => ({
            subject:
              fact.subject,
            role:
              fact.role,
            source:
              fact.source,
            strength:
              fact.strength
          })
        ),
      contradictions:
        algebra.contradictions
    },

    divergence
  });
}

const summary = {
  total: rows.length,
  preferredSetDivergences:
    rows.filter(
      (row) =>
        row.divergence
          .preferredSet
    ).length,
  variantRelationDivergences:
    rows.filter(
      (row) =>
        row.divergence
          .expectedVariantButCompeting
    ).length
};

fs.writeFileSync(
  outputPath,
  JSON.stringify(
    {
      generatedAt:
        new Date().toISOString(),
      mode: "READ_ONLY",
      mutations: false,
      source:
        backupPath,
      summary,
      rows
    },
    null,
    2
  ) + "\n",
  "utf8"
);

console.log(
  "=== EVIDENCE ALGEBRA SHADOW AUDIT ==="
);

console.log(
  JSON.stringify(
    summary,
    null,
    2
  )
);

console.log("");
console.log(
  "Premières divergences :"
);

for (
  const row of
  rows.filter(
    (item) =>
      item.divergence
        .preferredSet ||
      item.divergence
        .expectedVariantButCompeting
  ).slice(0, 30)
) {
  console.log(
    JSON.stringify({
      id: row.id,
      title: row.title,
      current:
        row.current,
      algebra:
        row.algebra.identityClusters
          .map(
            (cluster) => ({
              canonical:
                cluster.canonical,
              names:
                cluster.names,
              sourceFamilies:
                cluster.sourceFamilies
            })
          ),
      divergence:
        row.divergence
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
