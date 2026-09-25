import {
  summarizeIdentityCandidateGroups,
  countIndependentSourceFamilies,
  decideRankedResolutionFromEvidence
} from "./evidence-algebra.mjs";

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
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function unique(values = []) {
  return [
    ...new Map(
      values
        .filter(Boolean)
        .map((value) => [
          normalized(value),
          value
        ])
    ).values()
  ];
}

function artistMatches(
  candidate = {},
  artistName = ""
) {
  const target =
    normalized(artistName);

  if (!target) return false;

  return (
    candidate.artists || []
  ).some(
    (name) =>
      normalized(name) === target
  );
}

function titleMatches(
  candidate = {},
  title = ""
) {
  return (
    normalized(candidate.title) ===
    normalized(title)
  );
}

export function buildResolutionEvidence({
  expected = {},
  candidates = [],
  providerSearches = [],
  interpreted = {}
} = {}) {
  const preferredArtists =
    expected.artists || [];

  const competingArtists =
    expected.competingArtists || [];

  const preferredSupport =
    summarizeIdentityCandidateGroups(
      preferredArtists.map(
        (artist) => ({
          artist,
          candidates:
            candidates.filter(
              (candidate) =>
                artistMatches(
                  candidate,
                  artist
                ) &&
                titleMatches(
                  candidate,
                  expected.title
                )
            )
        })
      )
    );

  const competingSupport =
    summarizeIdentityCandidateGroups(
      competingArtists.map(
        (artist) => ({
          artist,
          candidates:
            candidates.filter(
              (candidate) =>
                artistMatches(
                  candidate,
                  artist
                ) &&
                titleMatches(
                  candidate,
                  expected.title
                )
            )
        })
      )
    );

  const successfulProviders =
    unique(
      providerSearches
        .filter(({ ok }) => ok)
        .map(({ provider }) =>
          provider
        )
    );

  const failedProviders =
    unique(
      providerSearches
        .filter(({ ok }) => !ok)
        .map(({ provider }) =>
          provider
        )
    );

  const variants =
    (
      interpreted.issues || []
    )
      .filter(
        ({ type }) =>
          type ===
            "orthographic_variant" ||
          type ===
            "credit_name_variant"
      );

  const contradictions =
    (
      interpreted.issues || []
    )
      .filter(
        ({ type }) =>
          type ===
            "multiple_primary_candidates" ||
          type ===
            "topic_channel_disagreement"
      );

  const positive = [];

  for (
    const support of
    preferredSupport
  ) {
    if (support.sources.length) {
      positive.push({
        type:
          "preferred_identity_support",

        artist:
          support.artist,

        sources:
          support.sources,

        candidateCount:
          support.candidates.length
      });
    }
  }

  const contradictory = [];

  for (
    const support of
    competingSupport
  ) {
    if (support.sources.length) {
      contradictory.push({
        type:
          "competing_identity_support",

        artist:
          support.artist,

        sources:
          support.sources,

        candidateCount:
          support.candidates.length
      });
    }
  }

  const absence = [];

  for (
    const artist of
    competingArtists
  ) {
    const support =
      competingSupport.find(
        (item) =>
          normalized(item.artist) ===
          normalized(artist)
      );

    if (
      support &&
      support.sources.length === 0 &&
      successfulProviders.length
    ) {
      absence.push({
        type:
          "no_external_support_observed",

        artist,

        searchedProviders:
          successfulProviders,

        /*
         * Ceci n'est PAS une preuve négative.
         */
        conclusive: false
      });
    }
  }

  const unavailable =
    failedProviders.map(
      (provider) => ({
        type:
          "provider_unavailable",

        provider
      })
    );

  return {
    positive,
    variant:
      variants,
    contradictory,
    absence,
    unavailable,

    summary: {
      preferredArtists:
        preferredArtists,

      competingArtists:
        competingArtists,

      successfulProviders,
      failedProviders,

      preferredIndependentSources:
        countIndependentSourceFamilies(
          preferredSupport.filter(
            ({ candidates }) =>
              candidates.length > 0
          )
        ),

      competingIndependentSources:
        countIndependentSourceFamilies(
          competingSupport.filter(
            ({ candidates }) =>
              candidates.length > 0
          )
        ),

      hasKnownContradiction:
        competingArtists.length > 0,

      hasVariant:
        variants.length > 0
    }
  };
}

export function decideFromResolutionEvidence({
  evidence,
  ranking
} = {}) {
  return decideRankedResolutionFromEvidence({
    evidence,
    ranking
  });
}
