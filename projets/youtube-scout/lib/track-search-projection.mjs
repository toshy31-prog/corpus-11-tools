import { resolveTrack } from "./track-resolution.mjs";

function clean(value = "") {
  if (value == null) return "";

  return String(value)
    .normalize("NFKC")
    .replace(/\s+/gu, " ")
    .trim();
}

function removeDiacritics(value = "") {
  return clean(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .normalize("NFKC");
}

function punctuationTolerant(value = "") {
  return clean(value)
    .replace(/[‐-‒–—−]/gu, " ")
    .replace(/[."'’`´]/gu, "")
    .replace(/[()[\]{}]/gu, " ")
    .replace(/[/:;,_]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function comparisonKey(value = "") {
  return punctuationTolerant(
    removeDiacritics(value)
  )
    .toLocaleLowerCase();
}

function stripTrackPositionPrefix(value = "") {
  const source = clean(value);

  /*
   * Exemples :
   * B1. Pye Corner Audio -> Pye Corner Audio
   * A2. Suolo           -> Suolo
   * B1 B2 Little Guy    -> Little Guy
   *
   * On ne modifie jamais raw/interpreted.
   * C'est uniquement une variante de recherche.
   */
  return source
    .replace(
      /^(?:(?:[A-H]\d{1,2})[.\s:_-]*){1,4}/iu,
      ""
    )
    .trim();
}


function cloneRaw(item = {}) {
  /*
   * La projection ne doit jamais disposer d'une référence
   * mutable vers l'objet source.
   */
  return JSON.parse(JSON.stringify(item));
}

function queryKey(query) {
  /*
   * Dédoublonnage CONSERVATEUR.
   *
   * Il ne faut surtout pas utiliser comparisonKey() ici :
   * Múm / Mum et Mr. Oizo / Mr Oizo sont précisément des
   * projections différentes que nous voulons envoyer aux moteurs.
   *
   * On déduplique seulement les variantes textuellement identiques
   * modulo casse et espaces.
   */
  return [
    clean(query.artist).toLocaleLowerCase(),
    clean(query.title).toLocaleLowerCase(),
    clean(query.version).toLocaleLowerCase(),
    clean(query.catalogueCode).toLocaleLowerCase()
  ].join("::");
}

function addQuery(target, candidate) {
  if (!candidate.artist && !candidate.title) return;

  const normalized = {
    kind: candidate.kind,
    artist: clean(candidate.artist),
    title: clean(candidate.title),
    version: clean(candidate.version),
    catalogueCode: clean(candidate.catalogueCode),
    weight: Number(
      Math.max(
        0,
        Math.min(1, candidate.weight)
      ).toFixed(3)
    ),
    transformations: [
      ...(candidate.transformations || [])
    ],
    basis: [
      ...(candidate.basis || [])
    ]
  };

  const key = queryKey(normalized);

  const existing = target.find(
    (item) => queryKey(item) === key
  );

  if (existing) {
    /*
     * Deux chemins peuvent produire la même requête.
     * On garde le poids le plus fort tout en conservant
     * la provenance des transformations.
     */
    existing.weight = Math.max(
      existing.weight,
      normalized.weight
    );

    existing.transformations = [
      ...new Set([
        ...existing.transformations,
        ...normalized.transformations
      ])
    ];

    existing.basis = [
      ...new Set([
        ...existing.basis,
        ...normalized.basis
      ])
    ];

    return;
  }

  target.push(normalized);
}

function sourceStrength(artist) {
  const sources = artist?.sources || [];

  if (
    sources.includes("description_explicit_field") &&
    sources.includes("youtube_topic_header")
  ) {
    return 1;
  }

  if (sources.includes("description_explicit_field")) {
    return 0.97;
  }

  if (sources.includes("youtube_topic_header")) {
    return 0.94;
  }

  if (sources.includes("youtube_topic_channel")) {
    return 0.88;
  }

  if (sources.includes("title_syntax")) {
    return 0.82;
  }

  return Math.max(
    0.65,
    artist?.confidence || 0
  );
}

function artistVariants(name) {
  const exact = clean(name);

  if (!exact) return [];

  const variants = [
    {
      value: exact,
      kind: "exact",
      multiplier: 1,
      transformations: []
    }
  ];

  const unicode = removeDiacritics(exact);

  if (
    unicode &&
    comparisonKey(unicode) !== comparisonKey(exact)
  ) {
    variants.push({
      value: unicode,
      kind: "normalized_unicode",
      multiplier: 0.95,
      transformations: ["remove_diacritics"]
    });
  } else if (unicode !== exact) {
    /*
     * Même clé de comparaison, mais forme utile pour les moteurs
     * de recherche externes.
     */
    variants.push({
      value: unicode,
      kind: "normalized_unicode",
      multiplier: 0.95,
      transformations: ["remove_diacritics"]
    });
  }

  const punctuation = punctuationTolerant(exact);

  if (
    punctuation &&
    punctuation !== exact &&
    punctuation !== unicode
  ) {
    variants.push({
      value: punctuation,
      kind: "punctuation_tolerant",
      multiplier: 0.93,
      transformations: ["normalize_punctuation"]
    });
  }

  const withoutPosition =
    stripTrackPositionPrefix(exact);

  if (
    withoutPosition &&
    withoutPosition !== exact
  ) {
    variants.push({
      value: withoutPosition,
      kind: "track_position_tolerant",
      multiplier: 0.91,
      transformations: [
        "strip_track_position_prefix"
      ]
    });
  }

  return variants;
}

function titleVariants(title, version = "") {
  const exact = clean(title);
  const result = [];

  if (exact) {
    result.push({
      value: exact,
      kind: "exact",
      multiplier: 1,
      transformations: []
    });
  }

  const unicode = removeDiacritics(exact);

  if (unicode && unicode !== exact) {
    result.push({
      value: unicode,
      kind: "normalized_unicode",
      multiplier: 0.96,
      transformations: ["remove_diacritics"]
    });
  }

  const punctuation = punctuationTolerant(exact);

  if (
    punctuation &&
    punctuation !== exact &&
    punctuation !== unicode
  ) {
    result.push({
      value: punctuation,
      kind: "punctuation_tolerant",
      multiplier: 0.94,
      transformations: ["normalize_punctuation"]
    });
  }

  if (exact && version) {
    result.push({
      value: `${exact} ${clean(version)}`,
      kind: "version_variant",
      multiplier: 0.90,
      transformations: ["append_version"]
    });
  }

  return result;
}

function preferredSearchArtists(resolution) {
  if (resolution.preferredArtists?.length) {
    return resolution.preferredArtists;
  }

  return (resolution.allArtistCandidates || [])
    .filter(
      ({ role }) =>
        role === "primary" ||
        role === "joint"
    );
}

function ambiguousAlternatives(resolution) {
  const preferred = new Set(
    (resolution.preferredArtists || [])
      .map(({ name }) => comparisonKey(name))
  );

  return (resolution.allArtistCandidates || [])
    .filter(
      ({ role, name }) =>
        (role === "primary" || role === "joint") &&
        !preferred.has(comparisonKey(name))
    );
}

function collaborationQuery(artists) {
  if (!Array.isArray(artists) || artists.length < 2) {
    return "";
  }

  return artists
    .map(({ name }) => clean(name))
    .filter(Boolean)
    .join(" ");
}

export function buildTrackSearchProjection(item = {}) {
  const raw = cloneRaw(item);
  const resolution = resolveTrack(item);

  const queries = [];
  const title = clean(resolution.title);
  const version = clean(resolution.version);
  const catalogueCode = clean(
    resolution.catalogueCode
  );

  const preferredArtists =
    preferredSearchArtists(resolution);

  /*
   * 1. Requêtes principales.
   */
  for (const artist of preferredArtists) {
    const strength = sourceStrength(artist);

    for (const artistVariant of artistVariants(
      artist.name
    )) {
      for (const titleVariant of titleVariants(
        title,
        version
      )) {
        addQuery(queries, {
          kind:
            artistVariant.kind === "exact" &&
            titleVariant.kind === "exact"
              ? "exact"
              : artistVariant.kind !== "exact"
                ? artistVariant.kind
                : titleVariant.kind,

          artist: artistVariant.value,
          title: titleVariant.value,
          version,
          catalogueCode,

          weight:
            strength *
            artistVariant.multiplier *
            titleVariant.multiplier,

          transformations: [
            ...artistVariant.transformations,
            ...titleVariant.transformations
          ],

          basis: [
            ...(artist.sources || [])
          ]
        });
      }
    }
  }

  /*
   * 2. Collaboration : requête conjointe.
   *
   * On ne crée PAS une nouvelle identité.
   * C'est uniquement une projection destinée au moteur de recherche.
   */
  const joint = preferredArtists.filter(
    ({ role }) => role === "joint"
  );

  if (joint.length >= 2 && title) {
    addQuery(queries, {
      kind: "collaboration_variant",
      artist: collaborationQuery(joint),
      title,
      version,
      catalogueCode,
      weight: 0.89,
      transformations: [
        "flatten_collaboration_for_search"
      ],
      basis: joint.flatMap(
        ({ sources }) => sources || []
      )
    });
  }

  /*
   * 3. Candidats concurrents conservés comme fallback.
   *
   * Ils ne sont pas déclarés alias.
   */
  for (
    const artist of
    ambiguousAlternatives(resolution)
  ) {
    for (const variant of artistVariants(
      artist.name
    )) {
      addQuery(queries, {
        kind: "candidate_variant",
        artist: variant.value,
        title,
        version,
        catalogueCode,
        weight:
          0.72 *
          sourceStrength(artist) *
          variant.multiplier,
        transformations: [
          "use_competing_artist_candidate",
          ...variant.transformations
        ],
        basis: artist.sources || []
      });
    }
  }

  /*
   * 4. Recherche titre seule.
   *
   * Utile si les crédits artistes sont réellement irrésolus.
   * Poids volontairement inférieur.
   */
  if (title) {
    addQuery(queries, {
      kind: "title_only_fallback",
      artist: "",
      title,
      version,
      catalogueCode,
      weight: 0.58,
      transformations: [
        "drop_artist_constraint"
      ],
      basis: ["resolved_title"]
    });
  }

  /*
   * 5. Variante catalogue.
   *
   * Le code catalogue est une preuve discriminante très utile.
   */
  if (
    catalogueCode &&
    preferredArtists.length
  ) {
    for (const artist of preferredArtists) {
      addQuery(queries, {
        kind: "catalogue_assisted",
        artist: artist.name,
        title,
        version,
        catalogueCode,
        weight: Math.min(
          1,
          sourceStrength(artist) + 0.04
        ),
        transformations: [
          "catalogue_constraint"
        ],
        basis: [
          ...(artist.sources || []),
          "catalogue_code"
        ]
      });
    }
  }

  queries.sort((a, b) => {
    if (b.weight !== a.weight) {
      return b.weight - a.weight;
    }

    return (
      `${a.artist} ${a.title}`
        .localeCompare(
          `${b.artist} ${b.title}`
        )
    );
  });

  return {
    raw,

    interpreted: {
      title,
      preferredArtists:
        resolution.preferredArtists || [],
      secondaryCredits:
        resolution.secondaryCredits || [],
      version: version || null,
      catalogueCode: catalogueCode || null,
      issues: resolution.issues || [],
      identityStatus:
        resolution.identityStatus
    },

    queries,

    policy: {
      mutatesRaw: false,
      identityResolved: false,
      normalizationsAreAliases: false
    }
  };
}
