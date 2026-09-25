import fs from "node:fs";
import path from "node:path";

import {
  buildTrackSearchProjection
} from "../lib/track-search-projection.mjs";

import {
  buildResolutionEvidence
} from "../lib/resolution-evidence.mjs";

const input =
  process.argv[2];

if (!input) {
  console.error(`
Usage:
  node scripts/resolution-evidence-corpus-audit.mjs backup.json

Exemple:
  node scripts/resolution-evidence-corpus-audit.mjs /chemin/backup.json
`);
  process.exit(2);
}

const absolute =
  path.resolve(input);

const OUTPUT_DIR =
  path.resolve(
    "validation-0.14"
  );

fs.mkdirSync(
  OUTPUT_DIR,
  {
    recursive: true
  }
);

function clean(value = "") {
  if (value == null) return "";

  return String(value)
    .normalize("NFKC")
    .replace(/\s+/gu, " ")
    .trim();
}

function normalized(value = "") {
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

function percentage(
  value,
  total
) {
  if (!total) return 0;

  return Number(
    (
      value /
      total *
      100
    ).toFixed(2)
  );
}

function unique(values = []) {
  const seen =
    new Set();

  const result = [];

  for (const value of values) {
    const k =
      normalized(value);

    if (
      !k ||
      seen.has(k)
    ) {
      continue;
    }

    seen.add(k);
    result.push(value);
  }

  return result;
}

function issueTypes(
  interpreted
) {
  return new Set(
    (
      interpreted.issues || []
    ).map(
      ({ type }) => type
    )
  );
}

function hasIssue(
  interpreted,
  type
) {
  return issueTypes(
    interpreted
  ).has(type);
}

function issueValues(
  interpreted,
  type
) {
  return (
    interpreted.issues || []
  )
    .filter(
      (issue) =>
        issue.type === type
    );
}

/*
 * ----------------------------------------------------------
 * Extraction prudente des vidéos depuis le backup.
 *
 * Les backups Scout ont évolué :
 * on ne dépend donc pas d'un seul chemin JSON.
 *
 * On recherche récursivement des objets ressemblant
 * réellement à des vidéos YouTube.
 * ----------------------------------------------------------
 */

function videoIdOf(
  value = {}
) {
  return clean(
    value.videoId ||
    value.video_id ||
    value.youtubeVideoId ||
    value.youtube_video_id ||
    value.id?.videoId ||
    ""
  );
}

function titleOf(
  value = {}
) {
  return clean(
    value.title ||
    value.snippet?.title ||
    ""
  );
}

function channelTitleOf(
  value = {}
) {
  return clean(
    value.channelTitle ||
    value.channel_title ||
    value.channel ||
    value.uploader ||
    value.snippet?.channelTitle ||
    ""
  );
}

function descriptionOf(
  value = {}
) {
  return String(
    value.description ||
    value.snippet?.description ||
    ""
  );
}

function looksLikeVideo(
  value
) {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const title =
    titleOf(value);

  if (!title) {
    return false;
  }

  const videoId =
    videoIdOf(value);

  const channel =
    channelTitleOf(value);

  const description =
    descriptionOf(value);

  const hasYouTubeShape =
    Boolean(
      videoId ||
      value.youtubeUrl ||
      value.youtubeURL ||
      value.youtube_url ||
      value.snippet?.resourceId
        ?.videoId ||
      value.kind ===
        "youtube#video" ||
      value.resourceId
        ?.videoId
    );

  const hasMusicShape =
    Boolean(
      channel &&
      (
        description ||
        /-\s*Topic$/iu
          .test(channel)
      )
    );

  return (
    hasYouTubeShape ||
    hasMusicShape
  );
}

function normalizeVideo(
  value
) {
  return {
    videoId:
      videoIdOf(value) ||
      clean(
        value.snippet
          ?.resourceId
          ?.videoId ||
        value.resourceId
          ?.videoId
      ),

    title:
      titleOf(value),

    channelTitle:
      channelTitleOf(value),

    description:
      descriptionOf(value),

    duration:
      clean(
        value.duration ||
        value.contentDetails
          ?.duration ||
        ""
      ),

    publishedAt:
      clean(
        value.publishedAt ||
        value.snippet
          ?.publishedAt ||
        ""
      )
  };
}

function collectVideos(
  root
) {
  /*
   * --------------------------------------------------------
   * Format canonique Scout
   * --------------------------------------------------------
   *
   * Dans un backup Scout moderne, `library` est la population
   * de référence.
   *
   * Chaque entrée possède son véritable ID vidéo YouTube dans
   * `item.id`.
   *
   * IMPORTANT :
   * on ne généralise volontairement PAS `value.id` dans
   * `videoIdOf()`, car le reste du backup contient de nombreuses
   * entités non vidéo possédant elles aussi un champ `id`.
   *
   * Donc :
   *   - library existe => elle fait autorité ;
   *   - extraction récursive => fallback anciens formats seulement.
   */
  if (
    root &&
    typeof root === "object" &&
    Array.isArray(root.library)
  ) {
    const canonical =
      root.library
        .filter(
          (item) =>
            item &&
            typeof item === "object" &&
            !Array.isArray(item) &&
            clean(item.id) &&
            titleOf(item)
        )
        .map(
          (item) => ({
            videoId:
              clean(item.id),

            title:
              titleOf(item),

            channelTitle:
              channelTitleOf(item),

            description:
              descriptionOf(item),

            duration:
              clean(
                item.duration ||
                item.contentDetails
                  ?.duration ||
                (
                  Number.isFinite(
                    Number(
                      item.durationSeconds
                    )
                  )
                    ? String(
                        item.durationSeconds
                      )
                    : ""
                )
              ),

            durationSeconds:
              Number.isFinite(
                Number(
                  item.durationSeconds
                )
              )
                ? Number(
                    item.durationSeconds
                  )
                : null,

            publishedAt:
              clean(
                item.publishedAt ||
                item.snippet
                  ?.publishedAt ||
                ""
              ),

            /*
             * On conserve ces champs utiles pour les audits
             * futurs sans les interpréter ici.
             */
            availability:
              clean(
                item.availability
              ),

            playlistIds:
              Array.isArray(
                item.playlistIds
              )
                ? [
                    ...item.playlistIds
                  ]
                : [],

            sourceShape:
              "scout_library"
          })
        );

    /*
     * Un backup valide ne devrait jamais contenir deux fois le
     * même ID dans library. On déduplique quand même par sécurité,
     * sans aucune heuristique title/channel/description.
     */
    const byId =
      new Map();

    for (
      const video of canonical
    ) {
      if (
        !byId.has(
          video.videoId
        )
      ) {
        byId.set(
          video.videoId,
          video
        );
      }
    }

    return [
      ...byId.values()
    ];
  }

  /*
   * --------------------------------------------------------
   * Fallback anciens / autres formats
   * --------------------------------------------------------
   */
  const found = [];
  const seenObjects =
    new WeakSet();

  function walk(value) {
    if (
      !value ||
      typeof value !==
        "object"
    ) {
      return;
    }

    if (
      seenObjects.has(value)
    ) {
      return;
    }

    seenObjects.add(value);

    if (
      looksLikeVideo(value)
    ) {
      found.push(
        normalizeVideo(value)
      );
    }

    if (
      Array.isArray(value)
    ) {
      for (
        const item of value
      ) {
        walk(item);
      }

      return;
    }

    for (
      const child of
      Object.values(value)
    ) {
      walk(child);
    }
  }

  walk(root);

  const deduped =
    new Map();

  for (
    const video of found
  ) {
    const key =
      video.videoId
        ? `id:${video.videoId}`
        : [
            "fallback",
            normalized(
              video.title
            ),
            normalized(
              video.channelTitle
            ),
            normalized(
              video.description
            ).slice(0, 300)
          ].join("::");

    if (
      !deduped.has(key)
    ) {
      deduped.set(
        key,
        video
      );
    }
  }

  return [
    ...deduped.values()
  ];
}


/*
 * ----------------------------------------------------------
 * Classification locale
 * ----------------------------------------------------------
 */

function classifyProjection(
  projection
) {
  const interpreted =
    projection.interpreted;

  const issues =
    interpreted.issues || [];

  const preferred =
    interpreted
      .preferredArtists || [];

  const secondary =
    interpreted
      .secondaryCredits || [];

  const types =
    issueTypes(
      interpreted
    );

  const classes =
    [];

  const hasArtist =
    preferred.length > 0;

  const hasTitle =
    Boolean(
      clean(
        interpreted.title
      )
    );

  const hasRealReview =
    issues.some(
      ({ severity }) =>
        severity === "review"
    );

  const orthographicVariant =
    types.has(
      "orthographic_variant"
    );

  const creditVariant =
    types.has(
      "credit_name_variant"
    );

  const multiMain =
    types.has(
      "documented_multi_main"
    ) ||
    types.has(
      "multiple_main_artists"
    ) ||
    issues.some(
      ({ type }) =>
        /multi.?main/iu
          .test(type)
    );

  const topicDisagreement =
    types.has(
      "topic_channel_disagreement"
    );

  const primaryConflict =
    types.has(
      "multiple_primary_candidates"
    );

  const genericContainer =
    types.has(
      "generic_topic_container"
    );

  if (
    orthographicVariant
  ) {
    classes.push(
      "orthographic_variant"
    );
  }

  if (
    creditVariant
  ) {
    classes.push(
      "credit_variant"
    );
  }

  if (
    multiMain
  ) {
    classes.push(
      "documented_multi_main"
    );
  }

  if (
    topicDisagreement ||
    primaryConflict ||
    hasRealReview
  ) {
    classes.push(
      "known_identity_conflict"
    );
  }

  if (
    genericContainer
  ) {
    classes.push(
      "generic_topic_container"
    );
  }

  if (
    hasTitle &&
    hasArtist &&
    !hasRealReview &&
    !primaryConflict
  ) {
    classes.push(
      "local_interpretation_available"
    );
  }

  /*
   * "local_safe" ne signifie PAS identité externe démontrée.
   *
   * Cela signifie seulement :
   * la structure locale est assez propre pour être utilisée
   * comme entrée de recherche, sans review préalable.
   */
  const localSafe =
    hasTitle &&
    hasArtist &&
    !hasRealReview &&
    !primaryConflict;

  if (localSafe) {
    classes.push(
      "local_safe"
    );
  }

  /*
   * Lookup externe nécessaire si :
   * - conflit d'identité,
   * - absence d'artiste exploitable,
   * - conteneur générique,
   * - ou simplement identité non encore corroborée.
   *
   * Pour cet audit, une projection locale n'est jamais
   * assimilée à une identité externe confirmée.
   */
  const needsExternalLookup =
    Boolean(
      hasRealReview ||
      primaryConflict ||
      topicDisagreement ||
      genericContainer ||
      !hasArtist ||
      interpreted.identityStatus ===
        "unresolved"
    );

  if (
    needsExternalLookup
  ) {
    classes.push(
      "needs_external_lookup"
    );
  } else {
    classes.push(
      "external_lookup_not_needed_for_structure"
    );
  }

  if (
    !hasArtist
  ) {
    classes.push(
      "no_artist_locally_resolved"
    );
  }

  if (
    !hasTitle
  ) {
    classes.push(
      "no_title_locally_resolved"
    );
  }

  return {
    classes:
      unique(classes),

    localSafe,

    needsExternalLookup,

    facts: {
      title:
        interpreted.title,

      preferredArtists:
        preferred.map(
          ({
            name,
            role,
            confidence,
            sources
          }) => ({
            name,
            role,
            confidence,
            sources
          })
        ),

      secondaryCredits:
        secondary.map(
          ({
            name,
            role,
            confidence,
            sources
          }) => ({
            name,
            role,
            confidence,
            sources
          })
        ),

      version:
        interpreted.version ||
        "",

      catalogueCode:
        interpreted
          .catalogueCode ||
        "",

      identityStatus:
        interpreted
          .identityStatus ||
        "unknown",

      issues
    }
  };
}


/*
 * ----------------------------------------------------------
 * Priorité future réseau
 * ----------------------------------------------------------
 */

function externalPriority(
  classification
) {
  const classes =
    new Set(
      classification.classes
    );

  if (
    classes.has(
      "known_identity_conflict"
    )
  ) {
    return {
      level: 1,
      reason:
        "known_identity_conflict"
    };
  }

  if (
    classes.has(
      "no_artist_locally_resolved"
    )
  ) {
    return {
      level: 2,
      reason:
        "no_artist_locally_resolved"
    };
  }

  if (
    classes.has(
      "generic_topic_container"
    )
  ) {
    return {
      level: 2,
      reason:
        "generic_topic_container"
    };
  }

  if (
    classes.has(
      "orthographic_variant"
    ) ||
    classes.has(
      "credit_variant"
    )
  ) {
    return {
      level: 3,
      reason:
        "variant_needs_external_identity_link"
    };
  }

  if (
    classification
      .needsExternalLookup
  ) {
    return {
      level: 4,
      reason:
        "unresolved_external_identity"
    };
  }

  return {
    level: 9,
    reason:
      "no_immediate_external_lookup"
  };
}


/*
 * ----------------------------------------------------------
 * Main
 * ----------------------------------------------------------
 */

const backup =
  JSON.parse(
    fs.readFileSync(
      absolute,
      "utf8"
    )
  );

const videos =
  collectVideos(backup);

if (!videos.length) {
  console.error(
    "Aucune vidéo détectée dans le backup."
  );

  process.exit(1);
}

const rows = [];

for (
  const video of videos
) {
  let projection;

  try {
    projection =
      buildTrackSearchProjection(
        video
      );
  } catch (error) {
    rows.push({
      video,

      projectionError:
        String(
          error?.stack ||
          error
        ),

      classes: [
        "projection_error",
        "needs_external_lookup"
      ],

      localSafe: false,

      needsExternalLookup:
        true,

      priority: {
        level: 0,
        reason:
          "projection_error"
      }
    });

    continue;
  }

  const classification =
    classifyProjection(
      projection
    );

  /*
   * Ici resolutionEvidence reste purement LOCAL :
   * pas de candidats réseau,
   * pas de providerSearches.
   *
   * L'objet sert déjà à normaliser variants /
   * contradictions avant la future phase réseau.
   */
  const evidence =
    buildResolutionEvidence({
      expected: {
        artists:
          (
            projection
              .interpreted
              .preferredArtists ||
            []
          ).map(
            ({ name }) => name
          ),

        competingArtists:
          [],

        title:
          projection
            .interpreted
            .title
      },

      candidates: [],

      providerSearches: [],

      interpreted:
        projection.interpreted
    });

  rows.push({
    video,

    interpreted:
      classification.facts,

    classes:
      classification.classes,

    localSafe:
      classification.localSafe,

    needsExternalLookup:
      classification
        .needsExternalLookup,

    priority:
      externalPriority(
        classification
      ),

    localEvidence: {
      variants:
        evidence.variant,

      contradictions:
        evidence
          .contradictory,

      summary:
        evidence.summary
    },

    searchProjection: {
      queryCount:
        projection
          .queries
          ?.length ||
        0,

      queries:
        projection
          .queries ||
        []
    }
  });
}


/*
 * ----------------------------------------------------------
 * Agrégats
 * ----------------------------------------------------------
 */

const total =
  rows.length;

const counts = {};

for (
  const row of rows
) {
  for (
    const className of
    row.classes || []
  ) {
    counts[className] =
      (
        counts[className] ||
        0
      ) + 1;
  }
}

const priorityCounts = {};

for (
  const row of rows
) {
  const key =
    `${row.priority.level}:${row.priority.reason}`;

  priorityCounts[key] =
    (
      priorityCounts[key] ||
      0
    ) + 1;
}

const externalQueue =
  rows
    .filter(
      ({ needsExternalLookup }) =>
        needsExternalLookup
    )
    .sort(
      (a, b) =>
        a.priority.level -
          b.priority.level ||
        a.video.title
          .localeCompare(
            b.video.title
          )
    );

const summary = {
  total,

  extraction: {
    detectedVideos:
      videos.length,

    expectedReference:
      3881,

    deltaFromReference:
      total - 3881
  },

  counts,

  percentages:
    Object.fromEntries(
      Object.entries(counts)
        .map(
          ([key, value]) => [
            key,
            percentage(
              value,
              total
            )
          ]
        )
    ),

  externalLookup: {
    needed:
      externalQueue.length,

    notImmediatelyNeeded:
      total -
      externalQueue.length,

    neededPct:
      percentage(
        externalQueue.length,
        total
      ),

    priorityCounts
  },

  projectionErrors:
    counts.projection_error ||
    0
};

const report = {
  generatedAt:
    new Date()
      .toISOString(),

  source:
    absolute,

  mode:
    "local_read_only_corpus_audit",

  networkRequests:
    0,

  mutations:
    0,

  summary,

  rows
};


/*
 * ----------------------------------------------------------
 * JSON
 * ----------------------------------------------------------
 */

const jsonPath =
  path.join(
    OUTPUT_DIR,
    "resolution-evidence-corpus-audit.json"
  );

fs.writeFileSync(
  jsonPath,
  JSON.stringify(
    report,
    null,
    2
  ) + "\n"
);


/*
 * ----------------------------------------------------------
 * Queue réseau séparée
 * ----------------------------------------------------------
 */

const queuePath =
  path.join(
    OUTPUT_DIR,
    "resolution-external-lookup-queue.json"
  );

fs.writeFileSync(
  queuePath,
  JSON.stringify(
    {
      generatedAt:
        report.generatedAt,

      total:
        externalQueue.length,

      queue:
        externalQueue.map(
          (row) => ({
            priority:
              row.priority,

            video:
              row.video,

            interpreted:
              row.interpreted,

            classes:
              row.classes,

            queries:
              row.searchProjection
                .queries
          })
        )
    },
    null,
    2
  ) + "\n"
);


/*
 * ----------------------------------------------------------
 * Rapport texte
 * ----------------------------------------------------------
 */

const lines = [];

lines.push(
  "=== RESOLUTION EVIDENCE CORPUS AUDIT ===",
  "",
  `Source                 : ${absolute}`,
  `Total                  : ${total}`,
  `Référence attendue      : 3881`,
  `Delta                  : ${total - 3881}`,
  "",
  "=== CLASSIFICATION ==="
);

for (
  const [
    name,
    value
  ] of Object.entries(counts)
    .sort(
      (a, b) =>
        b[1] - a[1]
    )
) {
  lines.push(
    `${name.padEnd(36)} : ${String(value).padStart(5)} (${percentage(value, total)}%)`
  );
}

lines.push(
  "",
  "=== LOOKUP EXTERNE ===",
  `À rechercher            : ${externalQueue.length} (${percentage(externalQueue.length, total)}%)`,
  `Pas immédiat            : ${total - externalQueue.length} (${percentage(total - externalQueue.length, total)}%)`,
  "",
  "=== PRIORITES ==="
);

for (
  const [
    name,
    value
  ] of Object.entries(
    priorityCounts
  ).sort()
) {
  lines.push(
    `${name.padEnd(48)} : ${value}`
  );
}

lines.push(
  "",
  "=== TOP PRIORITE 1 ==="
);

for (
  const row of
  externalQueue
    .filter(
      ({ priority }) =>
        priority.level === 1
    )
    .slice(0, 80)
) {
  lines.push(
    `${row.video.title} | ${row.video.channelTitle} | ${row.priority.reason}`
  );
}

lines.push(
  "",
  "=== SANS ARTISTE LOCAL ==="
);

for (
  const row of
  rows
    .filter(
      ({ classes }) =>
        classes.includes(
          "no_artist_locally_resolved"
        )
    )
    .slice(0, 80)
) {
  lines.push(
    `${row.video.title} | ${row.video.channelTitle}`
  );
}

lines.push(
  "",
  "=== VARIANTES ORTHOGRAPHIQUES ==="
);

for (
  const row of
  rows
    .filter(
      ({ classes }) =>
        classes.includes(
          "orthographic_variant"
        )
    )
    .slice(0, 80)
) {
  lines.push(
    `${row.video.title} | ${row.video.channelTitle} | ${
      JSON.stringify(
        issueValues(
          {
            issues:
              row.interpreted
                .issues
          },
          "orthographic_variant"
        )
      )
    }`
  );
}

const txtPath =
  path.join(
    OUTPUT_DIR,
    "resolution-evidence-corpus-audit.txt"
  );

fs.writeFileSync(
  txtPath,
  lines.join("\n") +
    "\n"
);


/*
 * ----------------------------------------------------------
 * Console
 * ----------------------------------------------------------
 */

console.log(
  lines.join("\n")
);

console.log("");
console.log(
  `JSON    : ${jsonPath}`
);

console.log(
  `TXT     : ${txtPath}`
);

console.log(
  `QUEUE   : ${queuePath}`
);

console.log("");
console.log(
  "Réseau  : 0 requête"
);

console.log(
  "Mutation: 0"
);

if (
  total !== 3881
) {
  console.log("");
  console.log(
    "ATTENTION : le nombre extrait diffère de la référence 3881."
  );

  console.log(
    "Ne lance pas encore la phase réseau : on vérifiera d'abord l'extraction."
  );
}
