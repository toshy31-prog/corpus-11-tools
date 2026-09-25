import fs from "node:fs";
import path from "node:path";

/*
 * ============================================================
 * RESOLUTION NETWORK QUEUE
 * ============================================================
 *
 * But :
 *   transformer l'audit local des 3881 vidéos en plan réseau.
 *
 * IMPORTANT :
 *   - aucune requête réseau
 *   - aucune mutation du graphe
 *   - aucune correction du backup
 *   - aucune fusion d'identité
 *   - les normalisations restent des PROJECTIONS DE RECHERCHE
 *
 * Entrée :
 *   validation-0.14/resolution-evidence-corpus-audit.json
 *
 * Sorties :
 *   validation-0.14/resolution-network-queue.json
 *   validation-0.14/resolution-network-queue.txt
 *
 * Partition attendue :
 *   priorité réseau : 227
 *   recommandés     : 172
 *   différés        : 3482
 *   total           : 3881
 * ============================================================
 */

const input =
  process.argv[2] ||
  "validation-0.14/resolution-evidence-corpus-audit.json";

const absolute =
  path.resolve(input);

if (!fs.existsSync(absolute)) {
  console.error(
    `Rapport introuvable : ${absolute}`
  );
  process.exit(2);
}

const audit =
  JSON.parse(
    fs.readFileSync(
      absolute,
      "utf8"
    )
  );

if (
  !Array.isArray(audit.rows) ||
  !audit.summary
) {
  throw new Error(
    "Le rapport ne contient pas rows[] + summary."
  );
}

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

const OUTPUT_JSON =
  path.join(
    OUTPUT_DIR,
    "resolution-network-queue.json"
  );

const OUTPUT_TXT =
  path.join(
    OUTPUT_DIR,
    "resolution-network-queue.txt"
  );


/*
 * ------------------------------------------------------------
 * Utilitaires
 * ------------------------------------------------------------
 */

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
    .trim()
    .replace(/\s+/gu, " ");
}

function unique(values = []) {
  const out = [];
  const seen = new Set();

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
    out.push(value);
  }

  return out;
}

function pct(
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

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function issueTypes(row) {
  return safeArray(
    row.interpreted?.issues
  ).map(
    ({ type }) => type
  );
}

function preferredArtists(row) {
  return unique(
    safeArray(
      row.interpreted
        ?.preferredArtists
    ).map(
      ({ name }) =>
        clean(name)
    )
  );
}

function secondaryCredits(row) {
  return safeArray(
    row.interpreted
      ?.secondaryCredits
  );
}

function competingArtists(row) {
  const preferred =
    new Set(
      preferredArtists(row)
        .map(normalized)
    );

  const names = [];

  /*
   * Les contradictions/variantes déjà calculées
   * par resolution-evidence sont prioritaires.
   */
  for (
    const value of
    safeArray(
      row.localEvidence
        ?.summary
        ?.competingArtists
    )
  ) {
    names.push(
      clean(value)
    );
  }

  /*
   * On conserve aussi les noms apparaissant
   * explicitement dans certaines issues.
   */
  for (
    const issue of
    safeArray(
      row.interpreted?.issues
    )
  ) {
    for (
      const candidate of
      safeArray(issue.candidates)
    ) {
      if (
        typeof candidate ===
        "string"
      ) {
        names.push(
          clean(candidate)
        );
      } else if (
        candidate &&
        typeof candidate ===
        "object"
      ) {
        names.push(
          clean(candidate.name)
        );
      }
    }

    if (
      typeof issue.channelCandidate ===
      "string"
    ) {
      names.push(
        clean(
          issue.channelCandidate
        )
      );
    }

    for (
      const candidate of
      safeArray(
        issue.headerCandidates
      )
    ) {
      names.push(
        clean(candidate)
      );
    }
  }

  /*
   * Les channel hints sont des indices,
   * jamais une identité automatiquement fusionnée.
   */
  for (
    const credit of
    secondaryCredits(row)
  ) {
    if (
      credit.role ===
      "channel_hint"
    ) {
      names.push(
        clean(credit.name)
      );
    }
  }

  return unique(names)
    .filter(
      (name) =>
        !preferred.has(
          normalized(name)
        )
    );
}


/*
 * ------------------------------------------------------------
 * Classification des trois files
 * ------------------------------------------------------------
 *
 * La priorité déjà calculée dans le rapport est la source
 * canonique ici.
 *
 * level 1 :
 *   contradiction d'identité connue
 *
 * level 2 :
 *   artiste localement non résolu
 *   OU Topic générique
 *
 * level 3 :
 *   variante nécessitant un lien externe
 *
 * level 4 :
 *   enrichissement externe ordinaire
 * ------------------------------------------------------------
 */

function queueClass(row) {
  const level =
    Number(
      row.priority?.level
    );

  if (
    level === 1 ||
    level === 2
  ) {
    return "priority";
  }

  if (level === 3) {
    return "recommended";
  }

  return "deferred";
}


/*
 * ------------------------------------------------------------
 * Planification des variantes de recherche
 * ------------------------------------------------------------
 *
 * On évite d'envoyer toutes les variantes à tous les providers.
 *
 * Ordre :
 *   exact
 *   candidate_variant
 *   collaboration_variant
 *   normalized_unicode
 *   punctuation_tolerant
 *   track_position_tolerant
 *   version_variant
 *   title_only_fallback
 *
 * IMPORTANT :
 *   title_only_fallback n'est utilisé qu'en dernier.
 * ------------------------------------------------------------
 */

const QUERY_KIND_ORDER =
  new Map(
    [
      ["exact", 0],
      ["candidate_variant", 1],
      ["collaboration_variant", 2],
      ["normalized_unicode", 3],
      ["punctuation_tolerant", 4],
      ["track_position_tolerant", 5],
      ["version_variant", 6],
      ["title_only_fallback", 7]
    ]
  );

function queryKindRank(kind) {
  return (
    QUERY_KIND_ORDER.get(kind) ??
    99
  );
}

function querySignature(query) {
  return [
    normalized(query.artist),
    normalized(query.title),
    normalized(query.version),
    normalized(
      query.catalogueCode
    )
  ].join("::");
}

function dedupeQueries(
  queries
) {
  const seen =
    new Set();

  const out = [];

  for (
    const query of queries
  ) {
    const sig =
      querySignature(query);

    if (
      !query.title ||
      seen.has(sig)
    ) {
      continue;
    }

    seen.add(sig);
    out.push(query);
  }

  return out;
}

function chooseProjectedQueries(
  row,
  queue
) {
  const queries =
    dedupeQueries(
      safeArray(
        row.searchProjection
          ?.queries
      )
        .map(
          (query) => ({
            kind:
              clean(
                query.kind
              ),

            artist:
              clean(
                query.artist
              ),

            title:
              clean(
                query.title
              ),

            version:
              clean(
                query.version
              ),

            catalogueCode:
              clean(
                query.catalogueCode
              ),

            weight:
              Number(
                query.weight ?? 0
              ),

            transformations:
              safeArray(
                query.transformations
              ),

            basis:
              safeArray(
                query.basis
              )
          })
        )
        .sort(
          (a, b) =>
            (
              queryKindRank(
                a.kind
              ) -
              queryKindRank(
                b.kind
              )
            ) ||
            (
              b.weight -
              a.weight
            )
        )
    );

  const nonFallback =
    queries.filter(
      ({ kind }) =>
        kind !==
        "title_only_fallback"
    );

  const fallback =
    queries.find(
      ({ kind }) =>
        kind ===
        "title_only_fallback"
    );

  /*
   * Budget de VARIANTES, pas encore d'appels HTTP.
   *
   * priority:
   *   jusqu'à 4 recherches structurées + fallback
   *
   * recommended:
   *   jusqu'à 3 + fallback
   *
   * deferred:
   *   1 exacte seulement pour l'instant
   */
  let maxStructured;

  switch (queue) {
    case "priority":
      maxStructured = 4;
      break;

    case "recommended":
      maxStructured = 3;
      break;

    default:
      maxStructured = 1;
      break;
  }

  const selected =
    nonFallback.slice(
      0,
      maxStructured
    );

  /*
   * Fallback titre seul :
   * uniquement dans les files où un traitement
   * réseau immédiat/recommandé est prévu.
   */
  if (
    fallback &&
    (
      queue === "priority" ||
      queue === "recommended"
    )
  ) {
    selected.push(
      fallback
    );
  }

  return selected;
}


/*
 * ------------------------------------------------------------
 * Providers planifiés
 * ------------------------------------------------------------
 *
 * Les deux sources actuelles :
 *   - MusicBrainz
 *   - Discogs
 *
 * Le runner live décidera ensuite s'il doit réellement appeler
 * les deux selon les résultats précédents.
 * ------------------------------------------------------------
 */

const PROVIDERS = [
  "musicbrainz",
  "discogs"
];

function plannedProviderCalls(
  projectedQueries,
  queue
) {
  /*
   * Deferred :
   * on NE PLANIFIE PAS encore les appels.
   * On conserve seulement la requête candidate.
   */
  if (
    queue === "deferred"
  ) {
    return [];
  }

  const calls = [];

  for (
    const query of
    projectedQueries
  ) {
    for (
      const provider of
      PROVIDERS
    ) {
      calls.push({
        provider,

        query: {
          artist:
            query.artist,

          title:
            query.title,

          version:
            query.version,

          catalogueCode:
            query.catalogueCode
        },

        queryKind:
          query.kind,

        transformations:
          query.transformations,

        basis:
          query.basis,

        weight:
          query.weight
      });
    }
  }

  return calls;
}


/*
 * ------------------------------------------------------------
 * Politique d'arrêt du futur runner
 * ------------------------------------------------------------
 */

function stopPolicy(
  row,
  queue
) {
  const reason =
    clean(
      row.priority?.reason
    );

  if (
    reason ===
    "known_identity_conflict"
  ) {
    return {
      mode:
        "corroboration_required",

      minimumIndependentProviders:
        2,

      allowSingleProviderAutoAccept:
        false,

      note:
        "Une contradiction d'identité connue exige une corroboration indépendante avant acceptation automatique."
    };
  }

  if (
    queue ===
    "priority"
  ) {
    return {
      mode:
        "high_confidence_or_exhaust_budget",

      minimumIndependentProviders:
        1,

      allowSingleProviderAutoAccept:
        true,

      note:
        "Arrêt anticipé permis seulement sur correspondance forte artiste+titre ; sinon poursuivre jusqu'au budget prévu."
    };
  }

  if (
    queue ===
    "recommended"
  ) {
    return {
      mode:
        "identity_link",

      minimumIndependentProviders:
        1,

      allowSingleProviderAutoAccept:
        false,

      note:
        "Chercher surtout un lien d'identité externe ; ne pas transformer une simple normalisation en alias canonique."
    };
  }

  return {
    mode:
      "deferred",

    minimumIndependentProviders:
      0,

    allowSingleProviderAutoAccept:
      false,

    note:
      "Aucun appel réseau immédiat."
  };
}


/*
 * ------------------------------------------------------------
 * Construction d'un item
 * ------------------------------------------------------------
 */

function buildQueueItem(
  row,
  index
) {
  const queue =
    queueClass(row);

  const queries =
    chooseProjectedQueries(
      row,
      queue
    );

  const calls =
    plannedProviderCalls(
      queries,
      queue
    );

  return {
    order:
      index,

    queue,

    priority: {
      level:
        Number(
          row.priority?.level
        ),

      reason:
        clean(
          row.priority?.reason
        )
    },

    video: {
      videoId:
        clean(
          row.video?.videoId
        ),

      title:
        clean(
          row.video?.title
        ),

      channelTitle:
        clean(
          row.video
            ?.channelTitle
        ),

      durationSeconds:
        row.video
          ?.durationSeconds ??
        null,

      publishedAt:
        clean(
          row.video
            ?.publishedAt
        ),

      playlistIds:
        safeArray(
          row.video
            ?.playlistIds
        )
    },

    interpreted: {
      title:
        clean(
          row.interpreted
            ?.title
        ),

      preferredArtists:
        preferredArtists(
          row
        ),

      competingArtists:
        competingArtists(
          row
        ),

      version:
        clean(
          row.interpreted
            ?.version
        ),

      catalogueCode:
        clean(
          row.interpreted
            ?.catalogueCode
        ),

      identityStatus:
        clean(
          row.interpreted
            ?.identityStatus
        ),

      issueTypes:
        issueTypes(row)
    },

    local: {
      safe:
        Boolean(
          row.localSafe
        ),

      classes:
        safeArray(
          row.classes
        ),

      evidenceSummary:
        row.localEvidence
          ?.summary ||
        {}
    },

    searchPlan: {
      projectedQueries:
        queries,

      plannedProviderCalls:
        calls,

      maxHttpCalls:
        calls.length,

      providers:
        queue === "deferred"
          ? []
          : [...PROVIDERS]
    },

    stopPolicy:
      stopPolicy(
        row,
        queue
      )
  };
}


/*
 * ------------------------------------------------------------
 * Tri déterministe
 * ------------------------------------------------------------
 */

function prioritySort(
  a,
  b
) {
  /*
   * 1. niveau
   * 2. raison
   * 3. moins de requêtes en premier à priorité égale
   * 4. videoId stable
   */

  return (
    a.priority.level -
      b.priority.level
  ) ||
  a.priority.reason.localeCompare(
    b.priority.reason
  ) ||
  (
    a.searchPlan
      .maxHttpCalls -
    b.searchPlan
      .maxHttpCalls
  ) ||
  a.video.videoId.localeCompare(
    b.video.videoId
  );
}


/*
 * ------------------------------------------------------------
 * Build
 * ------------------------------------------------------------
 */

const items =
  audit.rows.map(
    (row, index) =>
      buildQueueItem(
        row,
        index
      )
  );

const priority =
  items
    .filter(
      ({ queue }) =>
        queue ===
        "priority"
    )
    .sort(
      prioritySort
    );

const recommended =
  items
    .filter(
      ({ queue }) =>
        queue ===
        "recommended"
    )
    .sort(
      prioritySort
    );

const deferred =
  items
    .filter(
      ({ queue }) =>
        queue ===
        "deferred"
    )
    .sort(
      prioritySort
    );


/*
 * ------------------------------------------------------------
 * Contrôles d'intégrité
 * ------------------------------------------------------------
 */

const total =
  items.length;

const partition =
  priority.length +
  recommended.length +
  deferred.length;

if (
  total !== 3881
) {
  throw new Error(
    `Corpus inattendu : ${total} au lieu de 3881.`
  );
}

if (
  partition !== total
) {
  throw new Error(
    `Partition incohérente : ${partition} au lieu de ${total}.`
  );
}

const videoIds =
  items.map(
    ({ video }) =>
      video.videoId
  );

const uniqueVideoIds =
  new Set(
    videoIds
  );

if (
  uniqueVideoIds.size !==
  total
) {
  throw new Error(
    `IDs non uniques : ${uniqueVideoIds.size}/${total}.`
  );
}


/*
 * Les nombres suivants constituent le contrat actuel
 * issu du dernier audit validé.
 */
const EXPECTED = {
  priority: 227,
  recommended: 172,
  deferred: 3482,
  total: 3881
};

const observed = {
  priority:
    priority.length,

  recommended:
    recommended.length,

  deferred:
    deferred.length,

  total
};

for (
  const [
    key,
    expected
  ] of
  Object.entries(EXPECTED)
) {
  if (
    observed[key] !==
    expected
  ) {
    throw new Error(
      `Partition ${key} inattendue : ${observed[key]} au lieu de ${expected}.`
    );
  }
}


/*
 * ------------------------------------------------------------
 * Statistiques
 * ------------------------------------------------------------
 */

function reasonCounts(
  queue
) {
  const counts =
    new Map();

  for (
    const item of queue
  ) {
    const key =
      item.priority.reason ||
      "unknown";

    counts.set(
      key,
      (
        counts.get(key) ||
        0
      ) + 1
    );
  }

  return Object.fromEntries(
    [...counts.entries()]
      .sort(
        (a, b) =>
          a[0].localeCompare(
            b[0]
          )
      )
  );
}

function sumCalls(queue) {
  return queue.reduce(
    (
      sum,
      item
    ) =>
      sum +
      item.searchPlan
        .maxHttpCalls,
    0
  );
}

function queryKindCounts(
  queue
) {
  const counts =
    new Map();

  for (
    const item of queue
  ) {
    for (
      const query of
      item.searchPlan
        .projectedQueries
    ) {
      counts.set(
        query.kind,
        (
          counts.get(
            query.kind
          ) ||
          0
        ) + 1
      );
    }
  }

  return Object.fromEntries(
    [...counts.entries()]
      .sort(
        (a, b) =>
          b[1] - a[1]
      )
  );
}

const summary = {
  total,

  partition: {
    priority:
      priority.length,

    recommended:
      recommended.length,

    deferred:
      deferred.length,

    sum:
      partition,

    delta:
      partition -
      total
  },

  percentages: {
    priority:
      pct(
        priority.length,
        total
      ),

    recommended:
      pct(
        recommended.length,
        total
      ),

    deferred:
      pct(
        deferred.length,
        total
      )
  },

  priorityReasons:
    reasonCounts(
      priority
    ),

  recommendedReasons:
    reasonCounts(
      recommended
    ),

  deferredReasons:
    reasonCounts(
      deferred
    ),

  projectedQueries: {
    priority:
      priority.reduce(
        (
          n,
          item
        ) =>
          n +
          item.searchPlan
            .projectedQueries
            .length,
        0
      ),

    recommended:
      recommended.reduce(
        (
          n,
          item
        ) =>
          n +
          item.searchPlan
            .projectedQueries
            .length,
        0
      ),

    deferred:
      deferred.reduce(
        (
          n,
          item
        ) =>
          n +
          item.searchPlan
            .projectedQueries
            .length,
        0
      )
  },

  theoreticalMaximumHttpCalls: {
    priority:
      sumCalls(
        priority
      ),

    recommended:
      sumCalls(
        recommended
      ),

    deferred:
      0,

    immediate:
      sumCalls(
        priority
      ),

    priorityPlusRecommended:
      sumCalls(
        priority
      ) +
      sumCalls(
        recommended
      )
  },

  priorityQueryKinds:
    queryKindCounts(
      priority
    ),

  generatedAt:
    new Date()
      .toISOString()
};


/*
 * ------------------------------------------------------------
 * Rapport JSON
 * ------------------------------------------------------------
 */

const report = {
  generatedAt:
    summary.generatedAt,

  source:
    absolute,

  mode:
    "PLAN_ONLY_READ_ONLY",

  networkRequests:
    0,

  graphMutations:
    0,

  backupMutations:
    0,

  policy: {
    sourceOfTruth:
      "resolution-evidence-corpus-audit",

    autoCanonicalizeAliases:
      false,

    temporarySearchNormalization:
      true,

    preserveRawMetadata:
      true,

    priorityNetworkCases:
      [
        "known_identity_conflict",
        "no_artist_locally_resolved",
        "generic_topic_container"
      ],

    recommendedCases: [
      "variant_needs_external_identity_link"
    ],

    deferredCases: [
      "unresolved_external_identity"
    ]
  },

  summary,

  queues: {
    priority,
    recommended,
    deferred
  }
};

fs.writeFileSync(
  OUTPUT_JSON,
  JSON.stringify(
    report,
    null,
    2
  ) + "\n"
);


/*
 * ------------------------------------------------------------
 * Rapport texte
 * ------------------------------------------------------------
 */

const lines = [];

lines.push(
  "=== RESOLUTION NETWORK QUEUE ===",
  "",
  `Source                  : ${absolute}`,
  `Mode                    : PLAN ONLY / READ ONLY`,
  `Requêtes réseau         : 0`,
  `Mutations graphe        : 0`,
  "",
  `Total                   : ${total}`,
  "",
  `Priorité réseau         : ${priority.length} (${pct(priority.length, total)}%)`,
  `Recommandés             : ${recommended.length} (${pct(recommended.length, total)}%)`,
  `Différés                : ${deferred.length} (${pct(deferred.length, total)}%)`,
  `Somme partition         : ${partition}`,
  `Delta                   : ${partition - total}`,
  "",
  "=== PRIORITE : REASONS ==="
);

for (
  const [
    reason,
    count
  ] of
  Object.entries(
    summary.priorityReasons
  )
) {
  lines.push(
    `${reason.padEnd(44)} : ${count}`
  );
}

lines.push(
  "",
  "=== BUDGET THEORIQUE MAXIMUM ===",
  "",
  `Priorité                : ${summary.theoreticalMaximumHttpCalls.priority} appels`,
  `Recommandés             : ${summary.theoreticalMaximumHttpCalls.recommended} appels`,
  `Différés                : 0 appel immédiat`,
  "",
  "NOTE : ce maximum suppose que chaque variante soit envoyée aux deux providers.",
  "Le futur runner devra arrêter tôt dès qu'une preuve suffisante est obtenue.",
  "",
  "=== QUERY KINDS — PRIORITE ==="
);

for (
  const [
    kind,
    count
  ] of
  Object.entries(
    summary.priorityQueryKinds
  )
) {
  lines.push(
    `${kind.padEnd(32)} : ${count}`
  );
}

lines.push(
  "",
  "=== 227 CAS PRIORITAIRES ===",
  ""
);

for (
  const [
    index,
    item
  ] of
  priority.entries()
) {
  lines.push(
    `${String(index + 1).padStart(3)}. ${item.video.title}`,
    `     videoId    : ${item.video.videoId}`,
    `     channel    : ${item.video.channelTitle}`,
    `     priority   : ${item.priority.level}:${item.priority.reason}`,
    `     preferred  : ${item.interpreted.preferredArtists.join(" | ") || "—"}`,
    `     competing  : ${item.interpreted.competingArtists.join(" | ") || "—"}`,
    `     title      : ${item.interpreted.title || "—"}`,
    `     variants   : ${item.searchPlan.projectedQueries.length}`,
    `     max calls  : ${item.searchPlan.maxHttpCalls}`,
    `     stop mode  : ${item.stopPolicy.mode}`,
    ""
  );
}

fs.writeFileSync(
  OUTPUT_TXT,
  lines.join("\n") +
    "\n"
);


/*
 * ------------------------------------------------------------
 * Console
 * ------------------------------------------------------------
 */

console.log(
  "",
  "=== RESOLUTION NETWORK QUEUE ===",
  "",
  `Source                  : ${absolute}`,
  `Total                   : ${total}`,
  "",
  `Priorité réseau         : ${priority.length} (${pct(priority.length, total)}%)`,
  `Recommandés             : ${recommended.length} (${pct(recommended.length, total)}%)`,
  `Différés                : ${deferred.length} (${pct(deferred.length, total)}%)`,
  "",
  `Partition               : ${partition}`,
  `Delta                   : ${partition - total}`,
  "",
  "=== PRIORITE PAR RAISON ==="
);

for (
  const [
    reason,
    count
  ] of
  Object.entries(
    summary.priorityReasons
  )
) {
  console.log(
    `${reason.padEnd(44)} : ${count}`
  );
}

console.log(
  "",
  "=== BUDGET MAX THEORIQUE ===",
  "",
  `Priorité                : ${summary.theoreticalMaximumHttpCalls.priority}`,
  `Priorité + recommandés  : ${summary.theoreticalMaximumHttpCalls.priorityPlusRecommended}`,
  "",
  "Aucune requête réseau effectuée.",
  "Aucune mutation du graphe effectuée.",
  "",
  `JSON : ${OUTPUT_JSON}`,
  `TXT  : ${OUTPUT_TXT}`,
  ""
);
