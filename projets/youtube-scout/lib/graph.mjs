import { artistNameMatch } from "./identity.mjs";
import { discogsReleaseGraph } from "./catalogue.mjs";
import { groundedIdentity } from "./departure-integrity.mjs";

function slug(value = "") {
  return String(value).toLocaleLowerCase("fr-FR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
}

function decade(value) {
  const year = Number(String(value || "").match(/(?:19|20)\d{2}/)?.[0]);
  return year >= 1900 && year <= 2100 ? `${Math.floor(year / 10) * 10}s` : "";
}

export function entityId(type, source, id) {
  return `${type}:${source}:${String(id)}`;
}

export function graphFromResolution(video, identity, recording, context = {}) {
  // Do not attach another provider's name-search results to this artist.
  context = { ...context };
  if (recording?.resolved?.artistCredits?.some(credit => credit.id) && !groundedIdentity(identity, recording)) {
    // Recording evidence wins over a same-name artist search. Keep the latter
    // as a choice, without importing that homonym's entire catalogue/context.
    context.music = null; context.discogs = null; context.wikidata = null;
  }
  if (!identity?.externalIds?.musicbrainz || String(context.music?.artist?.id) !== String(identity.externalIds.musicbrainz)) context.music = null;
  if (!identity?.externalIds?.discogs || String(context.discogs?.id) !== String(identity.externalIds.discogs)) context.discogs = null;
  if (!identity?.externalIds?.wikidata || String(context.wikidata?.id) !== String(identity.externalIds.wikidata)) context.wikidata = null;
  const entityMap = new Map();
  const claimMap = new Map();
  const edgeMap = new Map();
  const addEntity = (entity) => {
    if (!entity?.id || !entity?.type) return;
    entityMap.set(entity.id, { ...(entityMap.get(entity.id) || {}), ...entity });
  };
  const addClaim = (claim) => {
    if (!claim?.subject || !claim?.field || !claim?.source) return;
    const key = claim.id || `${claim.subject}:${claim.field}:${claim.source}:${JSON.stringify(claim.value)}`;
    claimMap.set(key, claim);
  };
  const addEdge = (edge) => {
    if (!edge?.from || !edge?.to || !edge?.kind) return;
    if (edge.from === `video:youtube:${video.id}` && ["probable_artist", "embodies"].includes(edge.kind)) edge = { ...edge, departureRevision: video.departureRevision || "" };
    const key = edge.id || `${edge.from}:${edge.kind}:${edge.to}`;
    edgeMap.set(key, edge);
  };
  const videoId = entityId("video", "youtube", video.id);
  addEntity({ id: videoId, type: "video", title: video.title, channelTitle: video.channelTitle || "", publishedAt: video.publishedAt || "", url: `https://www.youtube.com/watch?v=${video.id}`,
    ...Object.fromEntries(["categoryId", "channelId", "tags", "durationSeconds", "thumbnail"].filter(key => video[key] !== undefined).map(key => [key, video[key]])) });
  if (video.channelTitle) {
    const exact = /^UC[A-Za-z0-9_-]{22}$/.test(video.channelId || "");
    const channelId = entityId("channel", exact ? "youtube" : "unresolved-video", exact ? video.channelId : video.id);
    addEntity({ id: channelId, type: "channel", name: video.channelTitle, ...(exact ? { externalIds: { youtube: video.channelId } } : { basis: "channel_name_only" }) });
    addEdge({ from: videoId, to: channelId, kind: "published_by", status: exact ? "observed" : "unresolved", evidence: [videoId] });
  }
  const videoEra = decade(video.publishedAt);
  if (videoEra) {
    const eraId = entityId("era", "derived", videoEra);
    addEntity({ id: eraId, type: "era", name: videoEra, status: "derived_from_date" });
    addEdge({ from: videoId, to: eraId, kind: "published_in_era", status: "derived", evidence: [videoId] });
  }
  for (const [index, playlistId] of (video.playlistIds || []).entries()) {
    if (!playlistId) continue;
    const playlistNodeId = entityId("playlist", "youtube", playlistId);
    addEntity({ id: playlistNodeId, type: "playlist", name: video.playlistNames?.[index] || video.playlistNames?.[0] || `Playlist ${playlistId}` });
    addEdge({ from: videoId, to: playlistNodeId, kind: "included_in", status: "observed", evidence: [videoId] });
  }

  if (identity?.id) {
    addEntity({ id: identity.id, type: "artist", name: identity.canonicalName, aliases: identity.aliases || [], externalIds: identity.externalIds || {} });
    addEdge({ from: videoId, to: identity.id, kind: "probable_artist", status: groundedIdentity(identity, recording) ? "corroborated" : "candidate", evidence: [videoId, groundedIdentity(identity, recording) ? "recording_artist_id" : "catalogue_identity_only"] });
    for (const claim of identity.claims || []) addClaim({ ...claim, subject: identity.id });
  }

  // Preserve real catalogue candidates for a human choice, without granting
  // their discographies to the video until that choice has been made.
  for (const candidate of identity?.discogs?.candidates || (identity?.discogs?.id ? [identity.discogs] : [])) {
    if (!candidate.id || !artistNameMatch(identity.requestedName || identity.canonicalName, String(candidate.name).replace(/\s*\(\d+\)$/, "")).accepted) continue;
    if (String(identity.externalIds?.discogs || "") === String(candidate.id)) continue;
    const id = entityId("artist", "discogs", candidate.id);
    addEntity({ id, type: "artist", name: candidate.name, externalIds: { discogs: String(candidate.id) }, url: candidate.discogsUrl || "" });
    addEdge({ from: videoId, to: id, kind: "probable_artist", status: "candidate", evidence: [videoId, "discogs_name_search"] });
  }

  const discogsTrack = recording?.resolvedDiscogsTrack;
  if (discogsTrack?.release?.id && discogsTrack.trackEntityId) {
    const delta = discogsReleaseGraph(discogsTrack.release);
    const track = delta.entities.find(entity => entity.id === discogsTrack.trackEntityId && entity.type === "track");
    if (track) {
      delta.entities.forEach(addEntity);
      delta.edges.forEach(addEdge);
      addEdge({ from: videoId, to: track.id, kind: "embodies", status: "resolved", source: "discogs", evidence: ["discogs_release_tracklist", videoId] });
    }
  }
  const resolved = recording?.resolved;
  if (resolved?.id) {
    const recordingId = entityId("recording", "musicbrainz", resolved.id);
    addEntity({ id: recordingId, type: "recording", title: resolved.title, isrcs: resolved.isrcs || [], externalIds: { musicbrainz: resolved.id } });
    addEdge({ from: videoId, to: recordingId, kind: "embodies", status: "resolved", evidence: ["musicbrainz", videoId] });
    for (const credit of resolved.artistCredits || []) {
      const sameArtist = credit.id && String(identity?.externalIds?.musicbrainz || "") === String(credit.id);
      const artistId = sameArtist ? identity.id : credit.id ? entityId("artist", "musicbrainz", credit.id) : entityId("artist", "musicbrainz-name", slug(credit.name));
      if (!artistId) continue;
      addEntity({ id: artistId, type: "artist", name: credit.name, externalIds: credit.id ? { musicbrainz: credit.id } : {} });
      addEdge({ from: artistId, to: recordingId, kind: "credited_on", status: "observed", evidence: ["musicbrainz"] });
    }
    for (const release of resolved.releases || []) {
      const releaseId = entityId("release", "musicbrainz", release.id);
      addEntity({ id: releaseId, type: "release", title: release.title, date: release.date, country: release.country || "", externalIds: { musicbrainz: release.id } });
      addEdge({ from: recordingId, to: releaseId, kind: "appears_on", status: "observed", evidence: ["musicbrainz"] });
      const releaseEra = decade(release.date);
      if (releaseEra) {
        const eraId = entityId("era", "derived", releaseEra);
        addEntity({ id: eraId, type: "era", name: releaseEra, status: "derived_from_date" });
        addEdge({ from: releaseId, to: eraId, kind: "released_in_era", status: "derived", evidence: ["musicbrainz"] });
      }
    }
  }

  for (const release of context.music?.releases || []) {
    const releaseId = entityId("release-group", "musicbrainz", release.id);
    addEntity({ id: releaseId, type: "release_group", title: release.title, date: release.date || "", releaseType: [release.type, ...(release.secondaryTypes || [])].filter(Boolean).join(" · "), secondaryTypes: release.secondaryTypes || [], externalIds: { musicbrainz: release.id } });
    if (identity?.id) addEdge({ from: identity.id, to: releaseId, kind: "primary_artist", status: "observed", evidence: ["musicbrainz"] });
    for (const label of release.labels || []) {
      const labelId = entityId("label", "musicbrainz-name", slug(label));
      addEntity({ id: labelId, type: "label", name: label });
      addEdge({ from: releaseId, to: labelId, kind: "issued_by", status: "observed", evidence: ["musicbrainz"] });
    }
    const releaseEra = decade(release.date);
    if (releaseEra) {
      const eraId = entityId("era", "derived", releaseEra);
      addEntity({ id: eraId, type: "era", name: releaseEra, status: "derived_from_date" });
      addEdge({ from: releaseId, to: eraId, kind: "released_in_era", status: "derived", evidence: ["musicbrainz"] });
    }
  }

  const documentedTerritory = context.music?.artist?.country || "";
  if (identity?.id && documentedTerritory) {
    const territoryId = entityId("territory", "musicbrainz-country", slug(documentedTerritory));
    addEntity({ id: territoryId, type: "territory", name: documentedTerritory, basis: "musicbrainz_country" });
    addEdge({ from: identity.id, to: territoryId, kind: "associated_scene", status: "territory_claim", evidence: ["musicbrainz"] });
  }

  for (const label of context.wikidata?.labels || []) {
    const labelId = entityId("label", "wikidata-name", slug(label));
    addEntity({ id: labelId, type: "label", name: label });
    if (identity?.id) addEdge({ from: identity.id, to: labelId, kind: "associated_label", status: "structured_claim", evidence: ["wikidata"] });
  }

  for (const release of context.discogs?.releases || []) {
    const releaseId = entityId(release.type === "master" ? "master" : "release", "discogs", release.id);
    addEntity({ id: releaseId, type: release.type === "master" ? "master" : "release", title: release.title, date: release.year || null, format: release.format || "", externalIds: { discogs: String(release.id) }, url: release.discogsUrl || "" });
    if (identity?.id) addEdge({ from: identity.id, to: releaseId, kind: "credited_on_release", role: release.role || "", status: "observed", evidence: ["discogs"] });
    if (release.label) {
      const labelId = entityId("label", "discogs-name", slug(release.label));
      addEntity({ id: labelId, type: "label", name: release.label });
      addEdge({ from: releaseId, to: labelId, kind: "issued_by", status: "observed", evidence: ["discogs"] });
    }
    const releaseEra = decade(release.year);
    if (releaseEra) {
      const eraId = entityId("era", "derived", releaseEra);
      addEntity({ id: eraId, type: "era", name: releaseEra, status: "derived_from_date" });
      addEdge({ from: releaseId, to: eraId, kind: "released_in_era", status: "derived", evidence: ["discogs"] });
    }
  }

  for (const release of recording?.discogsCandidates || []) {
    /*
     * Les candidats Discogs issus du nouvel adaptateur sont normalisés :
     *
     *   sourceId
     *   catalogueCode
     *   evidence.releaseId / artistIds / labelIds
     *   raw
     *
     * graphFromResolution acceptait historiquement un ancien format
     * (`id`, `year`, `catalogueNumber`, `labels`).
     *
     * On matérialise ici les preuves structurées disponibles sans déduire
     * aucune identité depuis le seul nom d'artiste.
     */
    const discogsId = String(
      release.evidence?.releaseId ??
      release.id ??
      release.sourceId ??
      ""
    ).trim();

    if (!discogsId) continue;

    const releaseId = entityId("release", "discogs", discogsId);

    const raw = release.raw || {};

    addEntity({
      id: releaseId,
      type: "release",
      title: raw.title || release.title || "",
      date: raw.released || raw.year || release.year || null,
      country: raw.country || release.country || "",
      catalogueNumber:
        release.catalogueCode ||
        release.catalogueNumber ||
        "",
      externalIds: { discogs: discogsId },
      url:
        release.evidence?.resourceUrl ||
        release.discogsUrl ||
        ""
    });

    if (resolved?.id) {
      addEdge({
        from: entityId("recording", "musicbrainz", resolved.id),
        to: releaseId,
        kind: "candidate_edition",
        status: release.corroborates ? "corroborated" : "candidate",
        evidence: ["discogs"]
      });
    }

    /*
     * raw.artists conserve directement l'association Discogs
     * ID <-> nom. On préfère cette structure à un rapprochement
     * positionnel entre artists[] et evidence.artistIds[].
     */
    for (const artist of Array.isArray(raw.artists) ? raw.artists : []) {
      if (artist?.id == null) continue;

      const artistId = entityId(
        "artist",
        "discogs",
        artist.id
      );

      addEntity({
        id: artistId,
        type: "artist",
        name: artist.name || artist.anv || "",
        externalIds: {
          discogs: String(artist.id)
        },
        source: "discogs"
      });

      addEdge({
        from: artistId,
        to: releaseId,
        kind: "credited_on_release",
        status: "observed",
        evidence: ["discogs"]
      });
    }

    /*
     * Compatibilité avec l'ancien format du pipeline.
     * Les labels du candidat restent traités comme avant.
     */
    /*
     * Les réponses Discogs détaillées transportent des labels structurés
     * dans `raw.labels`.
     *
     * On conserve leur véritable ID Discogs et leur numéro de catalogue.
     * Aucun rapprochement par nom n'est effectué ici.
     */
    const structuredLabels = Array.isArray(raw.labels)
      ? raw.labels.filter(
          label =>
            label?.id != null &&
            String(label.id).trim()
        )
      : [];

    for (const label of structuredLabels) {
      const labelId = entityId(
        "label",
        "discogs",
        label.id
      );

      addEntity({
        id: labelId,
        type: "label",
        name: label.name || "",
        externalIds: {
          discogs: String(label.id)
        },
        source: "discogs",
        url:
          label.resource_url ||
          ""
      });

      addEdge({
        from: releaseId,
        to: labelId,
        kind: "issued_by",
        status: "observed",
        evidence: ["discogs"],
        catalogueNumber:
          label.catno ||
          label.catalogueNumber ||
          label.catalog_number ||
          ""
      });
    }

    /*
     * Compatibilité avec l'ancien format de candidats Discogs :
     * `release.labels` pouvait ne contenir que des noms.
     *
     * Ces placeholders restent volontairement distincts des IDs structurés ;
     * leur réconciliation éventuelle relève de seedIdentityClusters().
     */
    for (const legacyLabel of release.labels || []) {
      const name =
        typeof legacyLabel === "string"
          ? legacyLabel
          : legacyLabel?.name || "";

      if (!name) continue;

      /*
       * Si ce même label est déjà présent sous forme structurée dans raw,
       * inutile de fabriquer en plus un placeholder de nom.
       */
      const alreadyStructured = structuredLabels.some(
        label =>
          slug(label?.name || "") === slug(name)
      );

      if (alreadyStructured) continue;

      const labelId = entityId(
        "label",
        "discogs-name",
        slug(name)
      );

      addEntity({
        id: labelId,
        type: "label",
        name
      });

      addEdge({
        from: releaseId,
        to: labelId,
        kind: "issued_by",
        status: "observed",
        evidence: ["discogs"]
      });
    }
    const releaseEra = decade(release.year);
    if (releaseEra) {
      const eraId = entityId("era", "derived", releaseEra);
      addEntity({ id: eraId, type: "era", name: releaseEra, status: "derived_from_date" });
      addEdge({ from: releaseId, to: eraId, kind: "released_in_era", status: "derived", evidence: ["discogs"] });
    }
  }

  const bandcamp = context.bandcamp || {};
  if (identity?.id && bandcamp.url) addClaim({ subject: identity.id, field: "profile_url", value: bandcamp.url, source: bandcamp.source || "user_confirmed", sourceUrl: bandcamp.url, status: bandcamp.status || "confirmed" });

  for (const collaboration of context.collaborations || []) {
    if (!identity?.id || !collaboration.artist) continue;
    const collaboratorId = entityId("artist", "youtube-title", slug(collaboration.artist));
    addEntity({ id: collaboratorId, type: "artist", name: collaboration.artist });
    addEdge({
      from: identity.id,
      to: collaboratorId,
      kind: collaboration.kind === "remix" ? "remixed_by" : "featured_with",
      status: "title_credit",
      evidence: [videoId]
    });
  }

  return { entities: [...entityMap.values()], claims: [...claimMap.values()], edges: [...edgeMap.values()] };
}

export function summarizeGraph(state = {}) {
  const byType = {};
  const byRelation = {};
  for (const entity of Object.values(state.entities || {})) byType[entity.type] = Number(byType[entity.type] || 0) + 1;
  for (const edge of Object.values(state.edges || {})) byRelation[edge.kind] = Number(byRelation[edge.kind] || 0) + 1;
  return { byType, byRelation, entities: Object.values(state.entities || {}).length, edges: Object.values(state.edges || {}).length };
}

export function normalizeDiscoveryCandidates(payload = {}, seed = {}) {
  const seen = new Set();
  const candidates = [];
  const add = (candidate) => {
    const recordingMbid = String(candidate.recordingMbid || candidate.recording_mbid || candidate.recording_mbids?.[0] || "");
    const artistMbid = String(candidate.artistMbid || candidate.artist_mbid || candidate.artist_mbids?.[0] || candidate.artist_credit_mbids?.[0] || "");
    const title = candidate.title || candidate.recording_name || candidate.name || "Titre non renseigné";
    const artist = candidate.artist || candidate.artist_name || candidate.artist_credit_name || "Artiste non renseigné";
    const key = recordingMbid || `${slug(artist)}:${slug(title)}`;
    if (!key || seen.has(key) || recordingMbid === seed.recordingMbid) return;
    seen.add(key);
    candidates.push({
      key,
      recordingMbid,
      artistMbid,
      title,
      artist,
      release: candidate.release || candidate.release_name || "",
      releaseMbid: candidate.releaseMbid || candidate.release_mbid || "",
      sourceRank: Number(candidate.sourceRank ?? candidate.score ?? 0) || null,
      relation: candidate.relation || "similar_recording",
      source: candidate.source || "listenbrainz",
      evidence: candidate.evidence || []
    });
  };
  for (const candidate of payload.candidates || payload.recordings || payload.similar_recordings || []) add(candidate);
  return candidates.slice(0, 60);
}

export function applyFeedback(candidates = [], events = []) {
  const latest = new Map();
  for (const event of events) latest.set(event.targetId, event.kind);
  return candidates.filter((candidate) => !["not_now", "too_obvious", "wrong_identity", "wrong_path"].includes(latest.get(candidate.key)))
    .map((candidate) => ({ ...candidate, kept: latest.get(candidate.key) === "keep", opened: latest.get(candidate.key) === "opened" }))
    .sort((a, b) => Number(b.kept) - Number(a.kept) || Number(a.opened) - Number(b.opened));
}
