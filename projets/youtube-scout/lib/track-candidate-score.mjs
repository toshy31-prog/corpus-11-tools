function clean(value = "") {
  if (value == null) return "";

  return String(value)
    .normalize("NFKC")
    .replace(/\s+/gu, " ")
    .trim();
}

function loose(value = "") {
  return clean(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[øØ]/gu, "o")
    .replace(/[æÆ]/gu, "ae")
    .replace(/[œŒ]/gu, "oe")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

function tokens(value = "") {
  return loose(value)
    .split(" ")
    .filter(Boolean);
}

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function levenshtein(a = "", b = "") {
  const aa = [...a];
  const bb = [...b];

  const row = Array(bb.length + 1)
    .fill(0)
    .map((_, i) => i);

  for (let i = 1; i <= aa.length; i++) {
    let previous = row[0];
    row[0] = i;

    for (let j = 1; j <= bb.length; j++) {
      const old = row[j];

      const cost =
        aa[i - 1] === bb[j - 1]
          ? 0
          : 1;

      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        previous + cost
      );

      previous = old;
    }
  }

  return row[bb.length];
}

export function textSimilarity(a = "", b = "") {
  const left = loose(a);
  const right = loose(b);

  if (!left || !right) return 0;
  if (left === right) return 1;

  const distance = levenshtein(left, right);
  const length = Math.max(
    [...left].length,
    [...right].length
  );

  const edit =
    length
      ? 1 - distance / length
      : 0;

  const leftTokens = new Set(tokens(left));
  const rightTokens = new Set(tokens(right));

  const intersection = [
    ...leftTokens
  ].filter(
    (token) => rightTokens.has(token)
  ).length;

  const union = new Set([
    ...leftTokens,
    ...rightTokens
  ]).size;

  const jaccard =
    union
      ? intersection / union
      : 0;

  return clamp(
    edit * 0.65 +
    jaccard * 0.35
  );
}

function normalizeArtists(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.name
      )
      .map(clean)
      .filter(Boolean);
  }

  return [clean(value)].filter(Boolean);
}

function bestArtistSimilarity(
  expectedArtists,
  candidateArtists
) {
  const expected =
    normalizeArtists(expectedArtists);

  const candidates =
    normalizeArtists(candidateArtists);

  if (!expected.length || !candidates.length) {
    return 0;
  }

  let best = 0;

  for (const a of expected) {
    for (const b of candidates) {
      best = Math.max(
        best,
        textSimilarity(a, b)
      );
    }
  }

  return best;
}

function durationSimilarity(
  expectedMs,
  candidateMs
) {
  const expected = Number(expectedMs);
  const candidate = Number(candidateMs);

  if (
    !Number.isFinite(expected) ||
    !Number.isFinite(candidate) ||
    expected <= 0 ||
    candidate <= 0
  ) {
    return null;
  }

  const delta =
    Math.abs(expected - candidate);

  if (delta <= 2000) return 1;
  if (delta <= 5000) return 0.95;
  if (delta <= 10000) return 0.85;
  if (delta <= 20000) return 0.65;
  if (delta <= 30000) return 0.40;

  return 0;
}

function exactLoose(a, b) {
  const left = loose(a);
  const right = loose(b);

  if (!left || !right) return null;

  return left === right ? 1 : 0;
}


function candidateMatchesArtist(candidate = {}, artistName = "") {
  const target = clean(artistName);

  if (!target) return false;

  return normalizeArtists(
    candidate.artists ||
    candidate.artist
  ).some(
    (name) =>
      textSimilarity(name, target) >= 0.92
  );
}

function knownArtistAlternatives(expected = {}) {
  const names = [
    ...(expected.competingArtists || []),
    ...(expected.artistAlternatives || [])
  ]
    .map((item) =>
      typeof item === "string"
        ? item
        : item?.name
    )
    .map(clean)
    .filter(Boolean);

  return [
    ...new Map(
      names.map((name) => [
        loose(name),
        name
      ])
    ).values()
  ];
}

function hasStrongDiscriminator(
  expected = {},
  scoredCandidate = {}
) {
  const components =
    scoredCandidate.components || {};

  /*
   * Pour dépasser une ambiguïté déjà connue, il faut autre chose
   * qu'une simple ressemblance artiste/titre.
   *
   * Catalogue exact = preuve très discriminante.
   * Durée quasi exacte + titre/artiste forts = combinaison utile.
   */
  if (
    components.catalogue === 1 &&
    clean(expected.catalogueCode)
  ) {
    return true;
  }

  if (
    components.duration >= 0.95 &&
    components.title >= 0.95 &&
    components.artist >= 0.95
  ) {
    return true;
  }

  return false;
}

function sourcePrior(source = "") {
  return {
    musicbrainz: 1.00,
    discogs: 0.96,
    wikidata: 0.80,
    bandcamp: 0.78,
    unknown: 0.65
  }[source] ?? 0.65;
}

export function scoreTrackCandidate(
  expected = {},
  candidate = {},
  options = {}
) {
  const weights = {
    artist: 0.34,
    title: 0.34,
    version: 0.08,
    catalogue: 0.10,
    duration: 0.08,
    source: 0.06,
    ...(options.weights || {})
  };

  const artist =
    bestArtistSimilarity(
      expected.artists ||
        expected.preferredArtists,
      candidate.artists ||
        candidate.artist
    );

  const title =
    textSimilarity(
      expected.title,
      candidate.title
    );

  /*
   * Une version absente chez un fournisseur signifie "inconnue",
   * pas "version différente".
   *
   * On ne compare que lorsque les deux côtés documentent
   * explicitement une version.
   */
  const version =
    clean(expected.version) &&
    clean(candidate.version)
      ? textSimilarity(
          expected.version,
          candidate.version
        )
      : null;

  const catalogue =
    exactLoose(
      expected.catalogueCode,
      candidate.catalogueCode
    );

  const duration =
    durationSimilarity(
      expected.durationMs,
      candidate.durationMs
    );

  const source =
    sourcePrior(
      candidate.source || "unknown"
    );

  const components = {
    artist,
    title,
    version,
    catalogue,
    duration,
    source
  };

  let numerator = 0;
  let denominator = 0;

  for (
    const [name, value] of
    Object.entries(components)
  ) {
    if (value == null) continue;

    const weight = weights[name] || 0;

    numerator += value * weight;
    denominator += weight;
  }

  const score =
    denominator
      ? numerator / denominator
      : 0;

  const penalties = [];

  const expectedArtistList =
    normalizeArtists(
      expected.artists ||
      expected.preferredArtists
    );

  const candidateArtistList =
    normalizeArtists(
      candidate.artists ||
      candidate.artist
    );

  /*
   * Un match sur A ne doit pas transformer automatiquement
   * "A + X + Y" en match parfait de crédit.
   *
   * Pénalité volontairement modérée :
   * des bases peuvent documenter des crédits plus complets
   * que la source initiale.
   */
  if (
    expectedArtistList.length &&
    candidateArtistList.length >
      expectedArtistList.length
  ) {
    const unmatched =
      candidateArtistList.filter(
        (candidateName) =>
          !expectedArtistList.some(
            (expectedName) =>
              textSimilarity(
                expectedName,
                candidateName
              ) >= 0.92
          )
      );

    if (unmatched.length) {
      penalties.push({
        type: "additional_artist_credits",
        value: Math.min(
          0.12,
          unmatched.length * 0.04
        ),
        artists: unmatched
      });
    }
  }

  if (
    artist < 0.45 &&
    normalizeArtists(
      expected.artists ||
        expected.preferredArtists
    ).length
  ) {
    penalties.push({
      type: "artist_mismatch",
      value: 0.18
    });
  }

  if (
    title < 0.55 &&
    clean(expected.title)
  ) {
    penalties.push({
      type: "title_mismatch",
      value: 0.22
    });
  }

  if (
    duration === 0
  ) {
    penalties.push({
      type: "duration_mismatch",
      value: 0.12
    });
  }

  if (
    catalogue === 0 &&
    clean(expected.catalogueCode) &&
    clean(candidate.catalogueCode)
  ) {
    penalties.push({
      type: "catalogue_mismatch",
      value: 0.18
    });
  }

  const penaltyTotal =
    penalties.reduce(
      (sum, item) => sum + item.value,
      0
    );

  const finalScore =
    clamp(score - penaltyTotal);

  return {
    candidate,
    score: Number(
      finalScore.toFixed(4)
    ),
    rawScore: Number(
      score.toFixed(4)
    ),
    components,
    penalties
  };
}

export function rankTrackCandidates(
  expected = {},
  candidates = [],
  options = {}
) {
  const ranked = candidates
    .map((candidate) =>
      scoreTrackCandidate(
        expected,
        candidate,
        options
      )
    )
    .sort(
      (a, b) =>
        b.score - a.score
    );

  const best = ranked[0] || null;
  const second = ranked[1] || null;

  const gap =
    best
      ? Number(
          (
            best.score -
            (second?.score || 0)
          ).toFixed(4)
        )
      : 0;

  return {
    ranked,
    best,
    second,
    gap
  };
}

export function decideTrackCandidate(
  expected = {},
  candidates = [],
  options = {}
) {
  const thresholds = {
    autoAcceptScore: 0.90,
    autoAcceptGap: 0.08,
    suggestedScore: 0.78,
    ambiguousGap: 0.04,
    ...(options.thresholds || {})
  };

  const ranking =
    rankTrackCandidates(
      expected,
      candidates,
      options
    );

  const { best, second, gap } = ranking;

  if (!best) {
    return {
      decision: "rejected",
      reason: "no_candidates",
      ...ranking
    };
  }

  /*
   * Le gap n'a de sens qu'entre candidats plausibles.
   *
   * Deux homonymes de titre avec artistes incompatibles
   * ne constituent pas une ambiguïté d'identité.
   */
  if (
    best.score <
      thresholds.suggestedScore
  ) {
    return {
      decision: "rejected",
      reason:
        "no_plausible_identity_match",
      ...ranking
    };
  }

  /*
   * L'entrée peut déjà contenir plusieurs hypothèses rivales.
   *
   * Exemple réel :
   *   header Topic  = Ken Hayakawa
   *   channel Topic = Kei Hayakawa
   *
   * Le score ne doit pas effacer cette incertitude uniquement
   * parce que la première hypothèse a servi à construire la requête.
   */
  const alternatives =
    knownArtistAlternatives(expected);

  const representedAlternatives =
    alternatives.filter((artistName) =>
      ranking.ranked.some(
        ({ candidate, score }) =>
          score >= thresholds.suggestedScore &&
          candidateMatchesArtist(
            candidate,
            artistName
          )
      )
    );

  if (
    representedAlternatives.length &&
    !hasStrongDiscriminator(
      expected,
      best
    )
  ) {
    return {
      decision: "ambiguous",
      reason:
        "known_input_identity_disagreement",
      knownAlternatives:
        representedAlternatives,
      ...ranking
    };
  }

  if (
    best.score >=
      thresholds.autoAcceptScore &&
    gap >=
      thresholds.autoAcceptGap
  ) {
    return {
      decision: "auto_accept",
      reason:
        "high_score_and_clear_gap",
      ...ranking
    };
  }

  if (
    best.score >=
      thresholds.suggestedScore &&
    (
      !second ||
      gap >= thresholds.ambiguousGap
    )
  ) {
    return {
      decision: "suggested",
      reason:
        "credible_but_not_decisive",
      ...ranking
    };
  }

  if (
    second &&
    Math.abs(gap) <
      thresholds.ambiguousGap
  ) {
    return {
      decision: "ambiguous",
      reason:
        "top_candidates_too_close",
      ...ranking
    };
  }

  return {
    decision: "rejected",
    reason:
      "insufficient_match_quality",
    ...ranking
  };
}
