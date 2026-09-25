import {
  adaptMusicBrainzRecording,
  adaptDiscogsCandidate
} from "./track-candidate-adapters.mjs";

import {
  decideTrackCandidate,
  textSimilarity
} from "./track-candidate-score.mjs";

import {
  summarizeExternalIdentitySupport,
  enforceKnownIdentityCorroboration
} from "./evidence-algebra.mjs";

function clean(value = "") {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/gu, " ")
    .trim();
}

function normalizedName(value = "") {
  return clean(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function preferredArtists(plan = {}) {
  return (plan.projection?.interpreted?.preferredArtists || [])
    .map((artist) =>
      typeof artist === "string"
        ? artist
        : artist?.name
    )
    .map(clean)
    .filter(Boolean);
}

function competingArtists(plan = {}) {
  const values = [];

  for (const issue of plan.projection?.interpreted?.issues || []) {
    if (
      issue.type !== "topic_channel_disagreement" &&
      issue.type !== "identity_disagreement"
    ) {
      continue;
    }

    if (issue.channelCandidate) {
      values.push(issue.channelCandidate);
    }

    for (const candidate of issue.candidates || []) {
      values.push(
        typeof candidate === "string"
          ? candidate
          : candidate?.name
      );
    }
  }

  const preferred = new Set(
    preferredArtists(plan).map(normalizedName)
  );

  return [...new Set(
    values
      .map(clean)
      .filter(Boolean)
      .filter((name) => !preferred.has(normalizedName(name)))
  )];
}

function expectedFromPlan(plan = {}) {
  const interpreted =
    plan.projection?.interpreted || {};

  return {
    artists: preferredArtists(plan),
    competingArtists: competingArtists(plan),
    identityStatus:
      interpreted.identityStatus || "unresolved",
    title: clean(interpreted.title),
    version: clean(interpreted.version),
    catalogueCode:
      clean(interpreted.catalogueCode),
    durationMs:
      Number(plan.durationMs || 0) || null
  };
}

function legacyMusicBrainzToRaw(candidate = {}) {
  return {
    id: candidate.id,
    title: candidate.title,
    score: candidate.sourceScore,
    length: candidate.lengthMs,
    "artist-credit":
      (candidate.artistCredits || []).map((credit) => ({
        name: credit.name,
        artist: {
          id: credit.id || "",
          name: credit.name
        }
      })),
    releases:
      (candidate.releases || []).map((release) => ({
        id: release.id,
        title: release.title,
        date: release.date,
        country: release.country,
        status: release.status
      })),
    isrcs: candidate.isrcs || []
  };
}

function legacyDiscogsToRaw(candidate = {}) {
  return {
    id: candidate.id,
    title: candidate.title,
    year: candidate.year,
    country: candidate.country,
    catno:
      candidate.catalogueNumber || "",
    label: candidate.labels || [],
    format: candidate.formats || [],
    resource_url:
      candidate.discogsUrl || ""
  };
}

export function decideRuntimeRecording({
  plan = {},
  musicBrainzCandidates = [],
  discogsCandidates = [],
  discogsTrackCandidates = []
} = {}) {
  const expected = expectedFromPlan(plan);

  const normalizedMusicBrainz =
    musicBrainzCandidates
      .map(legacyMusicBrainzToRaw)
      .map(adaptMusicBrainzRecording)
      .filter(
        (candidate) =>
          candidate.sourceId &&
          candidate.title &&
          candidate.artists.length
      );

  /*
   * Les résultats Discogs de l'endpoint historique sont encore des releases
   * de recherche, pas des pistes hydratées.
   *
   * Ils peuvent participer au classement comme indices, mais ne doivent pas
   * acquérir davantage d'autorité qu'ils n'en avaient auparavant.
   */
  const normalizedDiscogs =
    discogsCandidates
      .map(legacyDiscogsToRaw)
      .map(adaptDiscogsCandidate)
      .filter(
        (candidate) =>
          candidate.sourceId &&
          candidate.title &&
          candidate.artists.length
      );

  const hydratedDiscogs = discogsTrackCandidates.filter(candidate =>
    candidate?.source === "discogs" && candidate.sourceId && candidate.title &&
    candidate.artists?.length && candidate.evidence?.provenance === "discogs_release_tracklist"
  );
  const candidates = [...normalizedMusicBrainz, ...hydratedDiscogs];

  // Rank within each catalogue: a corroborating Discogs edition must not
  // become a rival MB recording merely because both have similar scores.
  // No cross-provider identity is merged. An MB ambiguity is never bypassed.
  const musicBrainzDecision = decideTrackCandidate(expected, normalizedMusicBrainz);
  const discogsDecision = decideTrackCandidate(expected, hydratedDiscogs);
  // Tracklist identity must also respect the requested version and duration;
  // a strong name/title score cannot compensate for a contradictory mix.
  if (discogsDecision.decision === "auto_accept") {
    const { components } = discogsDecision.best;
    if (components.artist < 0.98 || components.title < 0.98 ||
        (expected.version && (components.version == null || components.version < 0.95)) ||
        (components.duration != null && components.duration < 0.65) ||
        (components.catalogue === 0)) {
      discogsDecision.decision = "suggested";
      discogsDecision.reason = "tracklist_identity_requires_compatible_details";
    }
  }
  let decision = musicBrainzDecision.decision === "rejected"
    ? discogsDecision : musicBrainzDecision;

  const support =
    summarizeExternalIdentitySupport({
      candidates,
      expectedArtists:
        expected.artists,
      competingArtists:
        expected.competingArtists,
      expectedTitle:
        expected.title,
      normalizeName:
        normalizedName,
      similarity:
        textSimilarity,
      minimumArtistSimilarity: 0.92,
      minimumTitleSimilarity: 0.92
    });

  decision =
    enforceKnownIdentityCorroboration({
      decision,
      support,
      preferredArtists:
        expected.artists,
      competingArtists:
        expected.competingArtists,
      minimumIndependentSources: 2
    });

  return {
    expected,
    candidates,

    /*
     * Conservé comme observation diagnostique uniquement.
     * Pas d'autorité identitaire avant hydratation de la tracklist.
     */
    unhydratedDiscogsCandidates:
      normalizedDiscogs,

    support,
    decision,
    discogsDecision
  };
}

export function acceptedMusicBrainzId(
  runtimeDecision = {}
) {
  if (
    runtimeDecision.decision?.decision !==
      "auto_accept"
  ) {
    return "";
  }

  const candidate =
    runtimeDecision.decision?.best?.candidate;

  if (
    candidate?.source !== "musicbrainz"
  ) {
    return "";
  }

  return clean(candidate.sourceId);
}

export function applyRuntimeRecordingAuthority(
  legacyResolution = {},
  runtimeDecision = {}
) {
  const chosen = runtimeDecision.decision?.best?.candidate;
  const resolvedDiscogsTrack = runtimeDecision.decision?.decision === "auto_accept" &&
    chosen?.source === "discogs" && chosen.evidence?.provenance === "discogs_release_tracklist"
    ? {
        id: chosen.sourceId, source: "discogs", title: chosen.raw.track.title,
        trackEntityId: `track:discogs:${chosen.evidence.releaseId}:${chosen.evidence.trackIndex}`,
        artistCredits: (chosen.raw.track.artists?.length ? chosen.raw.track.artists : chosen.raw.release.artists || [])
          .map(artist => ({ id: String(artist.id || ""), name: artist.anv || artist.name })),
        release: chosen.raw.release,
        position: chosen.evidence.trackPosition,
        durationMs: chosen.durationMs,
        url: `https://www.discogs.com/release/${chosen.evidence.releaseId}`
      } : null;
  const discogsTrackCandidates = (runtimeDecision.discogsDecision?.ranked || []).slice(0, 8)
    .map(({ candidate }) => ({
      id: candidate.sourceId, title: candidate.raw.track.title, artists: candidate.artists,
      releaseId: candidate.evidence.releaseId, position: candidate.evidence.trackPosition,
      durationMs: candidate.durationMs, source: "discogs",
      url: `https://www.discogs.com/release/${candidate.evidence.releaseId}`
    }));
  legacyResolution = { ...legacyResolution, discogsTrackCandidates, resolvedDiscogsTrack };
  if (resolvedDiscogsTrack) {
    return {
      ...legacyResolution, status: "resolved_track", resolved: null,
      corroboration: { ...legacyResolution.corroboration, musicbrainz: "not_resolved", discogs: "tracklist_match" },
      runtimeDecision: { decision: "auto_accept", reason: runtimeDecision.decision.reason,
        acceptedMusicBrainzId: "", acceptedDiscogsTrackId: resolvedDiscogsTrack.id }
    };
  }
  const acceptedId =
    acceptedMusicBrainzId(runtimeDecision);

  const legacyResolvedId =
    clean(legacyResolution?.resolved?.id);

  /*
   * Fail closed:
   * l'ancien adaptateur peut encore calculer ses champs historiques,
   * mais il ne possède plus l'autorité finale pour déclarer "resolved".
   *
   * Une résolution automatique n'est conservée que si :
   *  - l'algèbre moderne a décidé auto_accept ;
   *  - le meilleur candidat accepté est MusicBrainz ;
   *  - son ID est exactement celui que le contrat historique allait exposer.
   */
  const authoritativeResolved =
    Boolean(
      acceptedId &&
      legacyResolvedId &&
      acceptedId === legacyResolvedId
    );

  if (authoritativeResolved) {
    return {
      ...legacyResolution,
      status: "resolved",
      resolved: legacyResolution.resolved,
      corroboration: {
        ...(legacyResolution.corroboration || {}),
        musicbrainz: "resolved"
      },
      runtimeDecision: {
        decision:
          runtimeDecision.decision?.decision || "",
        reason:
          runtimeDecision.decision?.reason || "",
        acceptedMusicBrainzId:
          acceptedId
      }
    };
  }

  /*
   * On conserve les candidats, Discogs, preuves et sourceStates.
   * On retire seulement l'affirmation d'identité automatique.
   */
  const fallbackStatus =
    runtimeDecision.decision?.decision === "ambiguous"
      ? "ambiguous"
      : (legacyResolution.candidates?.length || discogsTrackCandidates.length)
        ? "candidates"
        : "not_found";

  const evidence =
    (legacyResolution.evidence || []).filter(
      (item) =>
        !(
          item?.source === "musicbrainz" &&
          item?.basis === "exact_artist_title_duration"
        )
    );

  return {
    ...legacyResolution,
    status: fallbackStatus,
    resolved: null,
    evidence,
    corroboration: {
      ...(legacyResolution.corroboration || {}),
      musicbrainz:
        fallbackStatus === "ambiguous"
          ? "ambiguous"
          : "not_resolved"
    },
    runtimeDecision: {
      decision:
        runtimeDecision.decision?.decision || "",
      reason:
        runtimeDecision.decision?.reason || "",
      acceptedMusicBrainzId:
        acceptedId
    }
  };
}
