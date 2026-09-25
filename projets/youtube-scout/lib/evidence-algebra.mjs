
function clean(value = "") {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/gu, " ")
    .trim();
}

function looseKey(value = "") {
  return clean(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function exactKey(value = "") {
  return clean(value)
    .toLocaleLowerCase();
}

function foldSpecialLetters(value = "") {
  return clean(value)
    .replace(/æ/giu, "ae")
    .replace(/œ/giu, "oe")
    .replace(/ø/giu, "o")
    .replace(/ð/giu, "d")
    .replace(/þ/giu, "th")
    .replace(/ł/giu, "l");
}

function creditCoreKey(value = "") {
  return foldSpecialLetters(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase()
    .replace(/^\s*the\s+/u, "")
    .replace(/^\s*dj\s+/u, "")
    .replace(/\s*\([^)]{1,80}\)\s*$/u, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function probableCreditVariant(a, b) {
  const A = creditCoreKey(a);
  const B = creditCoreKey(b);

  if (!A || !B || A === B) {
    return Boolean(A && B && A === B);
  }

  return false;
}

function clamp01(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function uniqueBy(values, keyFn) {
  const seen = new Set();
  const out = [];

  for (const value of values) {
    const key = keyFn(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }

  return out;
}

export const ROLES = Object.freeze({
  PRIMARY: "primary",
  JOINT: "joint",
  FEATURING: "featuring",
  REMIXER: "remixer",
  CREDITED: "credited",
  CHANNEL_HINT: "channel_hint",
  UNKNOWN: "unknown"
});

export const FACT_KINDS = Object.freeze({
  IDENTITY_CLAIM: "identity_claim",
  CREDIT_CLAIM: "credit_claim",
  VARIANT_CLAIM: "variant_claim",
  ALIAS_CLAIM: "alias_claim",
  NEGATIVE_CLAIM: "negative_claim"
});

export const RELATIONS = Object.freeze({
  SAME_IDENTITY: "same_identity",
  ORTHOGRAPHIC_VARIANT: "orthographic_variant",
  CREDIT_VARIANT: "credit_variant",
  DOCUMENTED_ALIAS: "documented_alias",
  COMPETING_IDENTITY: "competing_identity",
  CREDIT_OF: "credit_of"
});

export function makeFact({
  kind = FACT_KINDS.IDENTITY_CLAIM,
  subject = "",
  role = ROLES.UNKNOWN,
  source = "unknown",
  sourceFamily = "",
  strength = 0,
  provenance = {},
  metadata = {}
} = {}) {
  const value = clean(subject);

  if (!value) {
    throw new TypeError("fact.subject is required");
  }

  return {
    kind,
    subject: value,
    role: clean(role) || ROLES.UNKNOWN,
    source: clean(source) || "unknown",
    sourceFamily:
      clean(sourceFamily) ||
      clean(source) ||
      "unknown",
    strength: clamp01(strength),
    provenance,
    metadata
  };
}

export function isIdentityBearingRole(role = "") {
  return [
    ROLES.PRIMARY,
    ROLES.JOINT
  ].includes(clean(role));
}

export function relationBetweenNames(a, b) {
  const A = clean(a);
  const B = clean(b);

  if (!A || !B) return null;

  const terminalQualifier = (value) => {
    const match = value.match(/\(([^()]{1,80})\)\s*$/u);
    return match ? looseKey(match[1]) : "";
  };

  const qualifierA = terminalQualifier(A);
  const qualifierB = terminalQualifier(B);

  if (
    qualifierA &&
    qualifierB &&
    qualifierA !== qualifierB
  ) {
    return RELATIONS.COMPETING_IDENTITY;
  }
  if (exactKey(A) === exactKey(B)) {
    return RELATIONS.SAME_IDENTITY;
  }

  if (looseKey(A) === looseKey(B)) {
    return RELATIONS.ORTHOGRAPHIC_VARIANT;
  }

  if (
    creditCoreKey(A) === creditCoreKey(B)
  ) {
    const specialFoldChanged =
      looseKey(A) !== looseKey(
        foldSpecialLetters(A)
      ) ||
      looseKey(B) !== looseKey(
        foldSpecialLetters(B)
      );

    const onlyOrthographic =
      specialFoldChanged &&
      !/^\s*(?:the|dj)\s+/iu.test(A) &&
      !/^\s*(?:the|dj)\s+/iu.test(B) &&
      !/\([^)]{1,80}\)\s*$/u.test(A) &&
      !/\([^)]{1,80}\)\s*$/u.test(B);

    return onlyOrthographic
      ? RELATIONS.ORTHOGRAPHIC_VARIANT
      : RELATIONS.CREDIT_VARIANT;
  }

  if (probableCreditVariant(A, B)) {
    return RELATIONS.CREDIT_VARIANT;
  }

  return RELATIONS.COMPETING_IDENTITY;
}


export function isNonCompetingRelation(relation = "") {
  return [
    RELATIONS.SAME_IDENTITY,
    RELATIONS.ORTHOGRAPHIC_VARIANT,
    RELATIONS.CREDIT_VARIANT,
    RELATIONS.DOCUMENTED_ALIAS
  ].includes(relation);
}

export function namesAreNonCompeting(a, b) {
  return isNonCompetingRelation(
    relationBetweenNames(a, b)
  );
}


export function summarizeIdentityObservations(
  observations = []
) {
  const byArtist = new Map();

  for (const observation of observations) {
    const artist =
      clean(
        observation.artist ||
        observation.subject ||
        observation.value
      );

    if (!artist) continue;

    const k =
      looseKey(artist);

    if (!k) continue;

    const source =
      clean(
        observation.source ||
        "unknown"
      ) || "unknown";

    const sourceFamily =
      clean(
        observation.sourceFamily ||
        source
      ) || "unknown";

    const strength =
      clamp01(
        observation.strength
      );

    if (!byArtist.has(k)) {
      byArtist.set(k, {
        artist,
        sources: new Set(),
        sourceFamilies: new Set(),
        strongest: 0,
        observations: []
      });
    }

    const bucket =
      byArtist.get(k);

    bucket.sources.add(source);
    bucket.sourceFamilies.add(
      sourceFamily
    );

    bucket.strongest =
      Math.max(
        bucket.strongest,
        strength
      );

    bucket.observations.push({
      source,
      sourceFamily,
      role:
        clean(
          observation.role
        ),
      strength
    });
  }

  return [
    ...byArtist.values()
  ]
    .map((entry) => ({
      artist:
        entry.artist,

      sources:
        [...entry.sources].sort(),

      sourceFamilies:
        [...entry.sourceFamilies]
          .sort(),

      independentSources:
        entry.sourceFamilies.size,

      strongest:
        Number(
          entry.strongest.toFixed(4)
        ),

      observations:
        entry.observations
    }))
    .sort(
      (a, b) =>
        b.independentSources -
          a.independentSources ||
        b.strongest -
          a.strongest ||
        a.artist.localeCompare(
          b.artist
        )
    );
}

export function evidencePacketsToIdentityObservations(
  evidencePackets = []
) {
  const observations = [];

  for (const packet of evidencePackets) {
    const packetSource =
      clean(
        packet.source ||
        "unknown"
      ) || "unknown";

    const packetSourceFamily =
      clean(
        packet.sourceFamily ||
        packetSource
      ) || "unknown";

    for (
      const observation of
      packet.observations || []
    ) {
      if (
        observation.kind !== "artist"
      ) {
        continue;
      }

      const artist =
        clean(
          observation.value
        );

      if (!artist) continue;

      observations.push({
        artist,
        source:
          clean(
            observation.source ||
            packetSource
          ) || packetSource,

        sourceFamily:
          clean(
            observation.sourceFamily ||
            packetSourceFamily
          ) || packetSourceFamily,

        role:
          clean(
            observation.role
          ),

        strength:
          clamp01(
            observation.strength
          )
      });
    }
  }

  return observations;
}

export function summarizeIdentityPackets(
  evidencePackets = []
) {
  return summarizeIdentityObservations(
    evidencePacketsToIdentityObservations(
      evidencePackets
    )
  );
}




export function candidateSupportsIdentity(
  candidate = {},
  artistName = "",
  {
    normalizeName = null,
    similarity = null,
    minimumSimilarity = 0.92
  } = {}
) {
  const normalize =
    typeof normalizeName === "function"
      ? normalizeName
      : looseKey;

  const target =
    normalize(artistName);

  if (!target) return false;

  return (
    candidate.artists || []
  ).some((name) => {
    const actual =
      normalize(name);

    if (!actual) return false;

    if (actual === target) {
      return true;
    }

    if (
      typeof similarity === "function"
    ) {
      return (
        similarity(
          actual,
          target
        ) >= minimumSimilarity
      );
    }

    return false;
  });
}

export function summarizeExternalIdentitySupport({
  candidates = [],
  expectedArtists = [],
  competingArtists = [],
  expectedTitle = "",
  normalizeName = null,
  similarity = null,
  minimumArtistSimilarity = 0.92,
  minimumTitleSimilarity = 0.92
} = {}) {
  const names = [
    ...expectedArtists,
    ...competingArtists
  ];

  return summarizeIdentityCandidateGroups(
    names.map((name) => {
      const supporting =
        candidates.filter(
          (candidate) => {
            const artistOk =
              candidateSupportsIdentity(
                candidate,
                name,
                {
                  normalizeName,
                  similarity,
                  minimumSimilarity:
                    minimumArtistSimilarity
                }
              );

            if (!artistOk) {
              return false;
            }

            if (
              typeof similarity ===
                "function"
            ) {
              return (
                similarity(
                  expectedTitle,
                  candidate.title
                ) >=
                minimumTitleSimilarity
              );
            }

            return (
              looseKey(
                expectedTitle
              ) ===
              looseKey(
                candidate.title
              )
            );
          }
        );

      return {
        artist: name,
        candidates: supporting
      };
    })
  );
}



export function decideIdentityFromSupport({
  support = [],
  preferredArtists = [],
  competingArtists = [],
  minimumIndependentSources = 2,
  strongSingleSourceThreshold = 0.97
} = {}) {
  const preferredKeys =
    new Set(
      preferredArtists
        .map(looseKey)
        .filter(Boolean)
    );

  const competingKeys =
    new Set(
      competingArtists
        .map(looseKey)
        .filter(Boolean)
    );

  const preferredSupport =
    support.filter(
      ({ artist }) =>
        preferredKeys.has(
          looseKey(artist)
        )
    );

  const competingSupport =
    support.filter(
      ({ artist }) =>
        competingKeys.has(
          looseKey(artist)
        )
    );

  const bestPreferred =
    preferredSupport[0] || null;

  const bestCompeting =
    competingSupport[0] || null;

  if (
    bestPreferred &&
    bestPreferred.independentSources >= minimumIndependentSources &&
    !(
      bestCompeting &&
      bestCompeting.independentSources >= minimumIndependentSources
    )
  ) {
    return {
      decision: "accepted",
      reason: "preferred_identity_corroborated",
      support,
      preferred: bestPreferred,
      competing: bestCompeting
    };
  }

  if (
    bestPreferred &&
    bestPreferred.strongest >= strongSingleSourceThreshold &&
    competingKeys.size === 0
  ) {
    return {
      decision: "accepted",
      reason: "strong_single_source_without_known_competitor",
      support,
      preferred: bestPreferred,
      competing: null
    };
  }

  if (bestPreferred && bestCompeting) {
    return {
      decision: "ambiguous",
      reason: "multiple_supported_identities",
      support,
      preferred: bestPreferred,
      competing: bestCompeting
    };
  }

  if (bestPreferred && competingKeys.size) {
    return {
      decision: "ambiguous",
      reason: "known_competitor_not_independently_resolved",
      support,
      preferred: bestPreferred,
      competing: bestCompeting
    };
  }

  if (support.length) {
    return {
      decision: "deferred",
      reason: "evidence_exists_but_identity_not_grounded",
      support,
      preferred: bestPreferred,
      competing: bestCompeting
    };
  }

  return {
    decision: "rejected",
    reason: "no_identity_evidence",
    support: [],
    preferred: null,
    competing: null
  };
}

export function decideRankedResolutionFromEvidence({
  evidence = {},
  ranking = {}
} = {}) {
  const best = ranking?.best || null;

  if (!best) {
    return { decision: "rejected", reason: "no_candidates" };
  }

  if (best.score < 0.55) {
    return {
      decision: "rejected",
      reason: "no_plausible_identity_match"
    };
  }

  const summary = evidence.summary || {};

  if (
    summary.hasKnownContradiction &&
    Number(summary.preferredIndependentSources || 0) < 2
  ) {
    return {
      decision: "ambiguous",
      reason: "known_identity_disagreement_requires_corroboration"
    };
  }

  if (
    Number(summary.preferredIndependentSources || 0) > 0 &&
    Number(summary.competingIndependentSources || 0) > 0
  ) {
    return {
      decision: "ambiguous",
      reason: "competing_identities_have_external_support"
    };
  }

  if (
    best.score >= 0.90 &&
    (
      ranking.gap >= 0.12 ||
      Number(summary.preferredIndependentSources || 0) >= 2
    )
  ) {
    return {
      decision: "auto_accept",
      reason: "strong_identity_evidence"
    };
  }

  return {
    decision: "ambiguous",
    reason: "insufficient_resolution_evidence"
  };
}


export function enforceKnownIdentityCorroboration({
  decision = {},
  support = [],
  preferredArtists = [],
  competingArtists = [],
  minimumIndependentSources = 2
} = {}) {
  const preferredKeys =
    new Set(
      preferredArtists
        .map(looseKey)
        .filter(Boolean)
    );

  const hasKnownCompetition =
    competingArtists
      .map(looseKey)
      .filter(Boolean)
      .length > 0;

  if (
    !hasKnownCompetition ||
    decision.decision !== "auto_accept"
  ) {
    return {
      ...decision,
      evidenceGate: {
        support
      }
    };
  }

  const preferred =
    support.find(
      ({ artist }) =>
        preferredKeys.has(
          looseKey(artist)
        )
    ) || null;

  const observedFamilies =
    preferred?.sourceFamilies ||
    preferred?.sources ||
    [];

  const observedIndependentSources =
    Number(
      preferred?.independentSources ??
      observedFamilies.length ??
      0
    );

  if (
    observedIndependentSources <
      minimumIndependentSources
  ) {
    return {
      ...decision,

      decision: "ambiguous",

      reason:
        "known_identity_disagreement_requires_corroboration",

      evidenceGate: {
        requiredIndependentSources:
          minimumIndependentSources,

        observedIndependentSources,

        observedPreferredSourceFamilies:
          observedFamilies,

        support
      }
    };
  }

  return {
    ...decision,
    evidenceGate: {
      requiredIndependentSources:
        minimumIndependentSources,

      observedIndependentSources,

      observedPreferredSourceFamilies:
        observedFamilies,

      support
    }
  };
}


export function summarizeIdentityCandidateGroups(
  groups = []
) {
  return groups.map((group) => {
    const artist =
      clean(group.artist);

    const candidates =
      Array.isArray(group.candidates)
        ? group.candidates
        : [];

    const sources =
      uniqueBy(
        candidates
          .map(
            (candidate) =>
              clean(
                candidate.source ||
                "unknown"
              ) || "unknown"
          ),
        (value) => value
      ).sort();

    const sourceFamilies =
      uniqueBy(
        candidates
          .map(
            (candidate) =>
              clean(
                candidate.sourceFamily ||
                candidate.source ||
                "unknown"
              ) || "unknown"
          ),
        (value) => value
      ).sort();

    return {
      artist,
      sources,
      sourceFamilies,
      independentSources:
        sourceFamilies.length,
      candidates
    };
  });
}

export function countIndependentSourceFamilies(
  support = []
) {
  const families =
    uniqueBy(
      support.flatMap(
        (entry) =>
          entry.sourceFamilies ||
          entry.sources ||
          []
      ),
      (value) =>
        clean(value)
    );

  return families.length;
}


export function collapseDuplicateFacts(facts = []) {
  return uniqueBy(
    facts,
    (fact) =>
      [
        fact.kind,
        looseKey(fact.subject),
        clean(fact.role),
        clean(fact.sourceFamily),
        clean(fact.source)
      ].join("::")
  );
}

export function clusterIdentityFacts(facts = []) {
  const identities =
    collapseDuplicateFacts(facts)
      .filter(
        (fact) =>
          fact.kind === FACT_KINDS.IDENTITY_CLAIM &&
          isIdentityBearingRole(fact.role)
      );

  const clusters = [];

  for (const fact of identities) {
    let cluster =
      clusters.find(
        (candidate) =>
          candidate.names.some(
            (name) =>
              relationBetweenNames(
                name,
                fact.subject
              ) !== RELATIONS.COMPETING_IDENTITY
          )
      );

    if (!cluster) {
      cluster = {
        canonical: fact.subject,
        names: [],
        facts: []
      };
      clusters.push(cluster);
    }

    if (
      !cluster.names.some(
        (name) =>
          exactKey(name) === exactKey(fact.subject)
      )
    ) {
      cluster.names.push(fact.subject);
    }

    cluster.facts.push(fact);
  }

  return clusters.map((cluster) => {
    const sourceFamilies =
      new Set(
        cluster.facts.map(
          (fact) => fact.sourceFamily
        )
      );

    const strongest =
      cluster.facts.reduce(
        (max, fact) =>
          Math.max(
            max,
            fact.strength
          ),
        0
      );

    return {
      ...cluster,
      sourceFamilies:
        [...sourceFamilies].sort(),
      independentSourceCount:
        sourceFamilies.size,
      strongest:
        Number(
          strongest.toFixed(4)
        )
    };
  });
}

export function buildContradictions(
  clusters = []
) {
  const contradictions = [];

  for (let i = 0; i < clusters.length; i++) {
    for (
      let j = i + 1;
      j < clusters.length;
      j++
    ) {
      const a = clusters[i];
      const b = clusters[j];

      contradictions.push({
        type: RELATIONS.COMPETING_IDENTITY,
        left: a.canonical,
        right: b.canonical,
        leftSources:
          a.sourceFamilies,
        rightSources:
          b.sourceFamilies,
        weight:
          Number(
            Math.min(
              a.strongest,
              b.strongest
            ).toFixed(4)
          )
      });
    }
  }

  return contradictions;
}

export function summarizeEvidence(facts = []) {
  const normalized =
    collapseDuplicateFacts(facts);

  const clusters =
    clusterIdentityFacts(
      normalized
    );

  const credits =
    normalized.filter(
      (fact) =>
        fact.kind === FACT_KINDS.CREDIT_CLAIM ||
        !isIdentityBearingRole(fact.role)
    );

  const aliases =
    normalized.filter(
      (fact) =>
        fact.kind === FACT_KINDS.ALIAS_CLAIM
    );

  const variants =
    normalized.filter(
      (fact) =>
        fact.kind === FACT_KINDS.VARIANT_CLAIM
    );

  return {
    facts: normalized,
    identityClusters: clusters,
    credits,
    aliases,
    variants,
    contradictions:
      buildContradictions(
        clusters
      )
  };
}

export function decideIdentity({
  facts = [],
  expected = [],
  competing = [],
  minimumIndependentSources = 2,
  strongSingleSourceThreshold = 0.97
} = {}) {
  const summary =
    summarizeEvidence(facts);

  const expectedKeys =
    new Set(
      expected.map(looseKey)
    );

  const competingKeys =
    new Set(
      competing.map(looseKey)
    );

  const preferred =
    summary.identityClusters
      .filter(
        (cluster) =>
          cluster.names.some(
            (name) =>
              expectedKeys.has(
                looseKey(name)
              )
          )
      )
      .sort(
        (a, b) =>
          b.independentSourceCount -
            a.independentSourceCount ||
          b.strongest -
            a.strongest
      );

  const rivals =
    summary.identityClusters
      .filter(
        (cluster) =>
          cluster.names.some(
            (name) =>
              competingKeys.has(
                looseKey(name)
              )
          )
      )
      .sort(
        (a, b) =>
          b.independentSourceCount -
            a.independentSourceCount ||
          b.strongest -
            a.strongest
      );

  const best =
    preferred[0] || null;

  const rival =
    rivals[0] || null;

  if (
    best &&
    best.independentSourceCount >=
      minimumIndependentSources &&
    !(
      rival &&
      rival.independentSourceCount >=
        minimumIndependentSources
    )
  ) {
    return {
      decision: "accepted",
      reason:
        "preferred_identity_corroborated",
      preferred: best,
      competing: rival,
      summary
    };
  }

  if (
    best &&
    best.strongest >=
      strongSingleSourceThreshold &&
    competingKeys.size === 0
  ) {
    return {
      decision: "accepted",
      reason:
        "strong_single_source_without_known_competitor",
      preferred: best,
      competing: null,
      summary
    };
  }

  if (best && rival) {
    return {
      decision: "ambiguous",
      reason:
        "multiple_supported_identities",
      preferred: best,
      competing: rival,
      summary
    };
  }

  if (
    best &&
    competingKeys.size > 0
  ) {
    return {
      decision: "ambiguous",
      reason:
        "known_competitor_not_resolved",
      preferred: best,
      competing: rival,
      summary
    };
  }

  if (
    summary.identityClusters.length > 0
  ) {
    return {
      decision: "deferred",
      reason:
        "identity_evidence_not_grounded_to_expected",
      preferred: null,
      competing: rival,
      summary
    };
  }

  return {
    decision: "rejected",
    reason: "no_identity_evidence",
    preferred: null,
    competing: null,
    summary
  };
}
