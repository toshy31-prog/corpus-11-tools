import fs from "node:fs";
import path from "node:path";

const input =
  process.argv[2] ||
  "validation-0.14/resolution-evidence-corpus-audit.json";

const absolute = path.resolve(input);

const report = JSON.parse(
  fs.readFileSync(absolute, "utf8")
);

if (!Array.isArray(report.rows)) {
  throw new Error(
    "Le rapport ne contient pas de tableau rows."
  );
}

function clean(value = "") {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/gu, " ")
    .trim();
}

function artistNames(row) {
  return (
    row.interpreted?.preferredArtists || []
  )
    .map((artist) =>
      clean(
        typeof artist === "string"
          ? artist
          : artist?.name
      )
    )
    .filter(Boolean);
}

function competingNames(row) {
  const values = [];

  for (
    const contradiction of
    row.localEvidence?.contradictions || []
  ) {
    for (
      const candidate of
      contradiction.candidates || []
    ) {
      const name =
        clean(
          typeof candidate === "string"
            ? candidate
            : candidate?.name
        );

      if (name) values.push(name);
    }
  }

  for (
    const issue of
    row.interpreted?.issues || []
  ) {
    if (
      issue.type ===
      "multiple_primary_candidates"
    ) {
      for (
        const candidate of
        issue.candidates || []
      ) {
        const name =
          clean(
            typeof candidate === "string"
              ? candidate
              : candidate?.name
          );

        if (name) values.push(name);
      }
    }
  }

  return [...new Set(values)];
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

/*
 * -------------------------------------------------------
 * Nouvelle sémantique
 * -------------------------------------------------------
 *
 * required_now:
 *   une décision fiable exige réellement une preuve externe.
 *
 * recommended:
 *   utile pour résoudre une faiblesse locale, mais le morceau
 *   possède déjà assez de structure pour rester exploitable.
 *
 * deferred_enrichment:
 *   aucune raison de bloquer l'usage ; canonicalisation externe
 *   seulement lorsque le morceau devient pertinent.
 */

function networkPolicy(row) {
  const reason =
    clean(row.priority?.reason);

  switch (reason) {
    case "known_identity_conflict":
      return {
        tier: 1,
        policy: "required_now",
        why:
          "Des identités concurrentes sont déjà connues ; une corroboration externe est nécessaire avant auto-résolution."
      };

    case "no_artist_locally_resolved":
      return {
        tier: 2,
        policy: "required_now",
        why:
          "Aucun artiste principal n'est résolu localement."
      };

    case "generic_topic_container":
      return {
        tier: 2,
        policy: "required_now",
        why:
          "Le conteneur Topic ne fournit pas à lui seul une identité artiste exploitable."
      };

    case "variant_needs_external_identity_link":
      return {
        tier: 3,
        policy: "recommended",
        why:
          "La lecture locale est exploitable, mais une variante de nom mérite une canonicalisation externe."
      };

    case "unresolved_external_identity":
      return {
        tier: 4,
        policy: "deferred_enrichment",
        why:
          "L'interprétation locale est sûre ; seule l'identité externe canonique manque."
      };

    default:
      return {
        tier: 9,
        policy: "review_policy",
        why:
          "Raison de priorité non reconnue."
      };
  }
}

const rows =
  report.rows.map((row) => {
    const policy =
      networkPolicy(row);

    return {
      videoId:
        clean(
          row.video?.videoId ||
          row.video?.id
        ),

      title:
        clean(
          row.interpreted?.title ||
          row.video?.title
        ),

      channelTitle:
        clean(
          row.video?.channelTitle
        ),

      preferredArtists:
        artistNames(row),

      competingArtists:
        competingNames(row),

      localSafe:
        Boolean(row.localSafe),

      originalNeedsExternalLookup:
        Boolean(
          row.needsExternalLookup
        ),

      originalPriority:
        row.priority || null,

      classes:
        row.classes || [],

      policy:
        policy.policy,

      tier:
        policy.tier,

      why:
        policy.why,

      queryCount:
        row.searchProjection
          ?.queryCount || 0,

      queries:
        row.searchProjection
          ?.queries || []
    };
  });

const counts = {};

for (const row of rows) {
  counts[row.policy] =
    (counts[row.policy] || 0) + 1;
}

const requiredNow =
  rows.filter(
    ({ policy }) =>
      policy === "required_now"
  );

const recommended =
  rows.filter(
    ({ policy }) =>
      policy === "recommended"
  );

const deferred =
  rows.filter(
    ({ policy }) =>
      policy ===
      "deferred_enrichment"
  );

const reviewPolicy =
  rows.filter(
    ({ policy }) =>
      policy === "review_policy"
  );

const byReason = {};

for (const row of rows) {
  const key =
    `${row.tier}:${row.originalPriority?.reason || "unknown"}`;

  byReason[key] =
    (byReason[key] || 0) + 1;
}

const plan = {
  generatedAt:
    new Date().toISOString(),

  source:
    absolute,

  mode:
    "read_only_network_planning",

  mutations: false,

  corpus: {
    total:
      rows.length,

    localSafe:
      rows.filter(
        ({ localSafe }) => localSafe
      ).length
  },

  policy: {
    /*
     * Les trois valeurs ont volontairement
     * des sens différents.
     */
    requiredNow:
      requiredNow.length,

    recommended:
      recommended.length,

    deferredEnrichment:
      deferred.length,

    reviewPolicy:
      reviewPolicy.length,

    immediateNetworkQueue:
      requiredNow.length,

    optionalNearTermQueue:
      recommended.length,

    noImmediateNetwork:
      deferred.length
  },

  byOriginalPriority:
    Object.fromEntries(
      Object.entries(byReason)
        .sort(
          ([a], [b]) =>
            a.localeCompare(b)
        )
    ),

  requiredNow,

  recommended,

  deferredEnrichment:
    deferred,

  reviewPolicy
};

const output =
  path.resolve(
    "validation-0.14/resolution-network-plan.json"
  );

fs.writeFileSync(
  output,
  JSON.stringify(
    plan,
    null,
    2
  )
);

console.log(
  "=== RESOLUTION NETWORK PLAN ==="
);

console.log(
  `Corpus                  : ${rows.length}`
);

console.log(
  `Localement sûrs         : ${plan.corpus.localSafe}`
);

console.log();

console.log(
  `RÉSEAU REQUIS MAINTENANT: ${requiredNow.length}`
);

console.log(
  `RÉSEAU RECOMMANDÉ       : ${recommended.length}`
);

console.log(
  `ENRICHISSEMENT DIFFÉRÉ  : ${deferred.length}`
);

console.log(
  `POLITIQUE À REVOIR      : ${reviewPolicy.length}`
);

console.log();

console.log(
  "=== PRIORITES ORIGINALES ==="
);

for (
  const [reason, count] of
  Object.entries(
    plan.byOriginalPriority
  )
) {
  console.log(
    `${reason.padEnd(48)} ${count}`
  );
}

console.log();

console.log(
  "=== FILE REQUISE MAINTENANT ==="
);

for (
  const row of
  requiredNow.slice(0, 80)
) {
  console.log(
    [
      `P${row.tier}`,
      row.videoId,
      row.preferredArtists.join(" + ") || "∅",
      row.title,
      row.originalPriority?.reason || "",
      row.channelTitle
    ].join(" | ")
  );
}

console.log();

console.log(
  "=== VARIANTES — RESEAU RECOMMANDE ==="
);

for (
  const row of
  recommended.slice(0, 80)
) {
  console.log(
    [
      `P${row.tier}`,
      row.videoId,
      row.preferredArtists.join(" + ") || "∅",
      row.title,
      row.channelTitle
    ].join(" | ")
  );
}

console.log();

console.log(
  `Rapport : ${output}`
);

console.log(
  "Aucune requête réseau effectuée."
);

console.log(
  "Aucune mutation du graphe effectuée."
);
