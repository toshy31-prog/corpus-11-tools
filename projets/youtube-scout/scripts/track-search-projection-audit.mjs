import fs from "node:fs";
import path from "node:path";

import {
  buildTrackSearchProjection
} from "../lib/track-search-projection.mjs";

const input = process.argv[2];

if (!input) {
  console.error(
    "Usage: node scripts/track-search-projection-audit.mjs backup.json"
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
  withQueries: 0,
  noQueries: 0,

  exact: 0,
  normalizedUnicode: 0,
  punctuationTolerant: 0,
  trackPositionTolerant: 0,
  candidateVariant: 0,
  collaborationVariant: 0,
  versionVariant: 0,
  catalogueAssisted: 0,
  titleOnlyFallback: 0,

  ambiguous: 0,
  collaborations: 0,
  documentedMultiMain: 0,
  topicChannelHints: 0,
  orthographicVariants: 0,
  creditNameVariants: 0,
  realConflicts: 0,
  suspiciousArtistLooksLikeTitle: 0,
  suspiciousTitleLooksLikeArtist: 0,
  excessiveQueries: 0
};

const samples = {
  noQueries: [],
  ambiguous: [],
  suspiciousArtistLooksLikeTitle: [],
  suspiciousTitleLooksLikeArtist: [],
  excessiveQueries: []
};

function keep(bucket, item, projection, max = 60) {
  if (samples[bucket].length >= max) return;

  samples[bucket].push({
    id: item.id,
    title: item.title,
    channelTitle: item.channelTitle,
    interpreted: projection.interpreted,
    queries: projection.queries.slice(0, 12)
  });
}

function looksLikeTitle(text = "") {
  const value = String(text || "").trim();

  /*
   * Signal volontairement strict.
   *
   * "Pye Corner Audio", "Audio Werner", etc. sont des artistes
   * parfaitement valides : les mots Audio/Mix seuls ne suffisent
   * absolument pas à conclure qu'un champ ressemble à un titre.
   */
  return (
    value.length > 90 ||

    /\s[-–—]\s/u.test(value) ||

    /\[(?:[A-Z]{1,12}[-_. ]?\d{1,8}|[A-Z0-9]{3,12})\]\s*$/u.test(
      value
    ) ||

    /\b(?:official\s+(?:music\s+)?video|official\s+audio|lyric\s+video)\b/iu.test(
      value
    ) ||

    /^(?:A|B)\d{1,2}[.\s_-]/u.test(value) ||

    /\b(?:EP|LP)\s+(?:A|B)?\d{0,2}\b/iu.test(value)
  );
}

function looksLikeArtist(text = "") {
  return (
    text &&
    text.length < 40 &&
    !/[.!?]$/u.test(text) &&
    !/\b(?:official|video|audio|mix|remix|edit|version)\b/iu.test(text)
  );
}

for (const item of backup.library) {
  counts.total++;

  const projection =
    buildTrackSearchProjection(item);

  const queries = projection.queries || [];

  if (queries.length) counts.withQueries++;
  else {
    counts.noQueries++;
    keep("noQueries", item, projection);
  }

  for (const query of queries) {
    if (
      (query.transformations || []).includes(
        "catalogue_constraint"
      )
    ) {
      counts.catalogueAssisted++;
    }

    switch (query.kind) {
      case "exact":
        counts.exact++;
        break;

      case "normalized_unicode":
        counts.normalizedUnicode++;
        break;

      case "punctuation_tolerant":
        counts.punctuationTolerant++;
        break;

      case "track_position_tolerant":
        counts.trackPositionTolerant++;
        break;

      case "candidate_variant":
        counts.candidateVariant++;
        break;

      case "collaboration_variant":
        counts.collaborationVariant++;
        break;

      case "version_variant":
        counts.versionVariant++;
        break;

      case "catalogue_assisted":
        break;

      case "title_only_fallback":
        counts.titleOnlyFallback++;
        break;
    }
  }

  const issues =
    projection.interpreted.issues || [];

  if (
    issues.some(
      ({ type }) =>
        type === "documented_collaboration"
    )
  ) {
    counts.collaborations++;
  }

  if (
    issues.some(
      ({ type }) =>
        type === "documented_multi_main"
    )
  ) {
    counts.documentedMultiMain++;
  }

  if (
    (projection.interpreted.secondaryCredits || [])
      .some(
        ({ role }) =>
          role === "channel_hint"
      )
  ) {
    counts.topicChannelHints++;
  }

  if (
    issues.some(
      ({ type }) =>
        type === "orthographic_variant"
    )
  ) {
    counts.orthographicVariants++;
  }

  if (
    issues.some(
      ({ type }) =>
        type === "credit_name_variant"
    )
  ) {
    counts.creditNameVariants++;
  }

  if (
    issues.some(
      ({ type, severity }) =>
        type === "multiple_primary_candidates" &&
        severity === "review"
    )
  ) {
    counts.realConflicts++;
  }

  if (
    issues.some(
      ({ severity }) => severity === "review"
    )
  ) {
    counts.ambiguous++;
    keep("ambiguous", item, projection);
  }

  const top = queries[0];

  if (top?.artist && looksLikeTitle(top.artist)) {
    counts.suspiciousArtistLooksLikeTitle++;

    keep(
      "suspiciousArtistLooksLikeTitle",
      item,
      projection
    );
  }

  if (
    top?.title &&
    looksLikeArtist(top.title) &&
    !top.artist
  ) {
    counts.suspiciousTitleLooksLikeArtist++;

    keep(
      "suspiciousTitleLooksLikeArtist",
      item,
      projection
    );
  }

  if (queries.length > 12) {
    counts.excessiveQueries++;

    keep(
      "excessiveQueries",
      item,
      projection
    );
  }
}

const pct = (n) =>
  counts.total
    ? Number(
        ((n / counts.total) * 100).toFixed(2)
      )
    : 0;

const report = {
  source: absolute,
  counts,
  percentages: {
    withQueries: pct(counts.withQueries),
    noQueries: pct(counts.noQueries),
    ambiguous: pct(counts.ambiguous),
    suspiciousArtistLooksLikeTitle:
      pct(counts.suspiciousArtistLooksLikeTitle),
    suspiciousTitleLooksLikeArtist:
      pct(counts.suspiciousTitleLooksLikeArtist),
    excessiveQueries:
      pct(counts.excessiveQueries)
  },
  samples
};

const output =
  path.resolve(
    "validation-0.14/track-search-projection-audit.json"
  );

fs.mkdirSync(
  path.dirname(output),
  { recursive: true }
);

fs.writeFileSync(
  output,
  JSON.stringify(report, null, 2) + "\n"
);

console.log("");
console.log(
  "=== TRACK SEARCH PROJECTION AUDIT ==="
);

console.log(
  `Total                  : ${counts.total}`
);

console.log(
  `Avec requêtes          : ${counts.withQueries} (${pct(counts.withQueries)}%)`
);

console.log(
  `Sans requêtes          : ${counts.noQueries} (${pct(counts.noQueries)}%)`
);

console.log("");
console.log(
  `Exact                  : ${counts.exact}`
);

console.log(
  `Unicode normalisé      : ${counts.normalizedUnicode}`
);

console.log(
  `Ponctuation tolérante  : ${counts.punctuationTolerant}`
);

console.log(
  `Positions A1/B1 retirées: ${counts.trackPositionTolerant}`
);

console.log(
  `Candidats concurrents  : ${counts.candidateVariant}`
);

console.log(
  `Collaborations         : ${counts.collaborationVariant}`
);

console.log(
  `Versions               : ${counts.versionVariant}`
);

console.log(
  `Catalogue assisté      : ${counts.catalogueAssisted}`
);

console.log(
  `Fallback titre seul    : ${counts.titleOnlyFallback}`
);

console.log("");
console.log(
  `Ambigus/review         : ${counts.ambiguous} (${pct(counts.ambiguous)}%)`
);

console.log(
  `Collaborations         : ${counts.collaborations}`
);

console.log(
  `Multi-main documentés  : ${counts.documentedMultiMain}`
);

console.log(
  `Topic channel hints    : ${counts.topicChannelHints}`
);

console.log(
  `Variantes orthographe  : ${counts.orthographicVariants}`
);

console.log(
  `Variantes de crédit    : ${counts.creditNameVariants}`
);

console.log(
  `Conflits à départager  : ${counts.realConflicts}`
);

console.log(
  `Artiste suspect        : ${counts.suspiciousArtistLooksLikeTitle} (${pct(counts.suspiciousArtistLooksLikeTitle)}%)`
);

console.log(
  `Titre seul suspect     : ${counts.suspiciousTitleLooksLikeArtist} (${pct(counts.suspiciousTitleLooksLikeArtist)}%)`
);

console.log(
  `Trop de requêtes       : ${counts.excessiveQueries} (${pct(counts.excessiveQueries)}%)`
);

console.log("");
console.log(`Rapport : ${output}`);
