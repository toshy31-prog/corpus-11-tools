function normalizedName(value = "") {
  return String(value)
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function uniqueStrings(values = []) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

export function artistNameMatch(requestedName, candidateName, aliases = [], linkedById = false) {
  const requested = normalizedName(requestedName);
  const candidate = normalizedName(candidateName);
  if (!requested || !candidate) return { accepted: false, basis: "candidate" };
  if (linkedById) return { accepted: true, basis: "structured_cross_id" };
  if (candidate === requested) return { accepted: true, basis: "exact_name" };
  if (uniqueStrings(aliases).some((alias) => normalizedName(alias) === requested)) return { accepted: true, basis: "exact_alias" };
  return { accepted: false, basis: "candidate" };
}

function claim(field, value, source, sourceId, sourceUrl, status = "structured") {
  if (value === undefined || value === null || value === "") return null;
  return { field, value, source, sourceId: sourceId || "", sourceUrl: sourceUrl || "", status };
}

function sourceName(source) {
  if (source === "musicbrainz") return "MusicBrainz";
  if (source === "wikidata") return "Wikidata";
  if (source === "discogs") return "Discogs";
  return "Titre YouTube corrigible";
}

export function buildArtistRegistryEntry(requestedName, sources = {}, observedAt = new Date().toISOString()) {
  const requested = String(requestedName || "").trim();
  const musicBrainz = sources.musicBrainz?.artist || null;
  const wikidata = sources.wikidata || null;
  const discogs = sources.discogs?.id ? sources.discogs : null;
  // Cross-IDs identify a source's subject, not the subject of the YouTube
  // query. First anchor that source to the requested name or a documented alias.
  const wikiAnchored = Boolean(wikidata && artistNameMatch(requested, wikidata.name, wikidata.aliases || []).accepted);
  const links = {
    musicbrainz: Boolean(wikiAnchored && wikidata?.musicBrainzId && musicBrainz?.id && String(wikidata.musicBrainzId) === String(musicBrainz.id)),
    discogs: Boolean((wikiAnchored && wikidata?.discogsId && discogs?.id && String(wikidata.discogsId) === String(discogs.id)) || discogs?.match === "user_confirmed")
  };
  const candidates = [
    musicBrainz ? { source: "musicbrainz", name: musicBrainz.name, aliases: musicBrainz.aliases || [], id: musicBrainz.id, url: musicBrainz.musicBrainzUrl, priority: 1, linked: links.musicbrainz } : null,
    wikidata ? { source: "wikidata", name: wikidata.name, aliases: wikidata.aliases || [], id: wikidata.id, url: wikidata.wikidataUrl, priority: 2, linked: false } : null,
    discogs ? { source: "discogs", name: discogs.name, aliases: discogs.aliases || [], id: discogs.id, url: discogs.discogsUrl, priority: 3, linked: links.discogs, userConfirmed: discogs.match === "user_confirmed" } : null
  ].filter(Boolean);
  for (const candidate of candidates) {
    Object.assign(candidate, artistNameMatch(requested, candidate.name, candidate.aliases, candidate.linked));
    if (candidate.userConfirmed) Object.assign(candidate, { accepted: true, basis: "user_confirmed" });
    if (candidate.source === "discogs" && !candidate.linked) Object.assign(candidate, { accepted: false, basis: "candidate" });
  }
  const matching = candidates.filter(({ accepted }) => accepted).sort((left, right) => {
    const strength = { structured_cross_id: 0, user_confirmed: 1, exact_name: 2, exact_alias: 3 };
    return strength[left.basis] - strength[right.basis] || left.priority - right.priority;
  });
  const selected = matching[0] || { source: "youtube", name: requested, priority: 9 };
  const canonicalName = selected.name || requested;
  const canonicalKey = normalizedName(canonicalName);

  const claims = [
    claim("name", requested, "youtube", "", "", "inferred"),
    ...candidates.flatMap((candidate) => [
      claim("name", candidate.name, candidate.source, candidate.id, candidate.url, candidate.basis),
      claim("external_id", candidate.id, candidate.source, candidate.id, candidate.url, candidate.basis),
      ...uniqueStrings(candidate.aliases).map((alias) => claim("alias", alias, candidate.source, candidate.id, candidate.url, candidate.basis))
    ]),
    ...(wikidata?.labels || []).map((label) => claim("associated_label", label, "wikidata", wikidata.id, wikidata.wikidataUrl))
  ].filter(Boolean);

  const structuredAgreement = [...new Set(matching.map(({ source }) => source))];
  const conflicts = candidates
    .filter(({ accepted, name }) => !accepted && normalizedName(name) !== normalizedName(requested))
    .map(({ name: value, source, url: sourceUrl }) => ({ field: "name", canonicalValue: canonicalName, conflictingValue: value, source, sourceUrl }));
  const aliases = uniqueStrings(matching.flatMap(({ name, aliases: values }) => [name, ...values]).filter((value) => normalizedName(value) !== canonicalKey));
  const externalIds = Object.fromEntries(claims
    .filter(({ field, status }) => field === "external_id" && status !== "candidate")
    .map(({ source, value }) => [source, String(value)]));
  const registryId = externalIds.musicbrainz ? `mbid:${externalIds.musicbrainz}`
    : externalIds.wikidata ? `wikidata:${externalIds.wikidata}`
      : externalIds.discogs ? `discogs:${externalIds.discogs}`
        : `local:${canonicalKey || "unknown"}`;

  return {
    id: registryId,
    type: "artist",
    requestedName: requested,
    canonicalName,
    canonicalSource: selected.source,
    aliases,
    externalIds,
    claims,
    conflicts,
    agreement: {
      status: conflicts.length ? "conflicted" : structuredAgreement.length >= 2 ? "multi_source" : "single_source",
      sources: structuredAgreement.map(sourceName)
    },
    resolution: {
      status: matching.some(({ basis }) => basis === "structured_cross_id") ? "confirmed_cross_id"
        : matching.some(({ basis }) => basis === "user_confirmed") ? "confirmed_user"
        : structuredAgreement.length >= 2 ? "corroborated"
          : structuredAgreement.length === 1 ? "single_source" : "unresolved",
      evidence: matching.map(({ source, basis }) => ({ source, basis }))
    },
    observedAt,
    sourceStates: sources.sourceStates || {},
    discogs: sources.discogs || { status: "not_configured" }
  };
}

export function registryStorageKey(name = "") {
  // Keep the historical browser key: changing name matching must not orphan
  // saved corrections or user-confirmed Discogs IDs.
  return `artist:${normalizedName(name).replace(/[^a-z0-9]/g, "") || "unknown"}`;
}

const TECHNICAL_SUFFIX = /\s*[([]\s*(?:official\s+(?:music\s+)?video|official\s+audio|audio|video|lyrics?|visuali[sz]er|hd|4k|remaster(?:ed)?(?:\s+\d{4})?)\s*[)\]]\s*$/i;
const MIX_SUFFIX = /\s*[([]\s*([^()[\]]*?\b(?:remix|rework|edit|mix|version|dub))\s*[)\]]\s*$/i;

export function parseTrackCandidate(videoTitle = "", probableArtist = "") {
  const sourceTitle = String(videoTitle || "").replace(/\s+/g, " ").trim();
  let cleaned = sourceTitle;
  while (TECHNICAL_SUFFIX.test(cleaned)) cleaned = cleaned.replace(TECHNICAL_SUFFIX, "").trim();
  const catalogueCode = cleaned.match(/\s*\[([A-Z][A-Z0-9._-]*\d[A-Z0-9._-]*)\]\s*$/)?.[1] || "";
  if (catalogueCode) cleaned = cleaned.replace(/\s*\[[^\]]+\]\s*$/, "").trim();
  const parts = cleaned.split(/\s+(?:-|–|—)\s+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return { status: "unparsed", sourceTitle, artist: String(probableArtist || "").trim(), title: "", mix: "", discarded: [] };
  let artist = parts.shift();
  const titlePart = parts.shift();
  const primaryArtist = artist.replace(/\s+(?:feat(?:uring)?|ft|with)\.?\s+.+$/i, "").trim();
  if (probableArtist && normalizedName(primaryArtist) === normalizedName(probableArtist)) artist = String(probableArtist).trim();
  else artist = primaryArtist;
  const mixMatch = titlePart.match(MIX_SUFFIX);
  const mix = mixMatch?.[1]?.trim() || "";
  const title = titlePart.replace(MIX_SUFFIX, "").replace(TECHNICAL_SUFFIX, "").trim();
  if (!artist || !title) return { status: "unparsed", sourceTitle, artist, title, mix, discarded: parts };
  return { status: "parsed", sourceTitle, artist, title, mix, ...(catalogueCode ? { catalogueCode } : {}), discarded: parts };
}

export function parseTrackCandidates(videoTitle = "", probableArtist = "") {
  const sourceTitle = String(videoTitle || "").replace(/\s+/g, " ").trim();
  const variants = [];
  const add = (value, basis) => {
    const parsed = parseTrackCandidate(value, probableArtist);
    if (parsed.status !== "parsed") return;
    const key = `${normalizedName(parsed.artist)}:${normalizedName(parsed.title)}:${normalizedName(parsed.mix)}`;
    if (!variants.some((candidate) => candidate.key === key)) variants.push({ ...parsed, key, basis });
  };
  add(sourceTitle, "standard_separator");
  add(sourceTitle.replace(/^\s*(?:premiere|exclusive|video premiere)\s*[:|]\s*/i, ""), "editorial_prefix_removed");
  add(sourceTitle.replace(/^\s*\[[^\]]{1,40}\]\s*/, ""), "bracket_prefix_removed");
  const byMatch = sourceTitle.match(/^(.{2,160}?)\s+by\s+(.{2,100}?)(?:\s*[([]|$)/i);
  if (byMatch) add(`${byMatch[2]} - ${byMatch[1]}`, "title_by_artist");
  if (probableArtist) {
    const separated = sourceTitle.split(/\s+(?:-|–|—)\s+/).map((part) => part.trim()).filter(Boolean);
    if (separated.length === 1 && sourceTitle.length >= 2) add(`${probableArtist} - ${sourceTitle}`, "known_artist_title_only_candidate");
    if (separated.length >= 2 && normalizedName(separated[0]) !== normalizedName(probableArtist)) add(`${probableArtist} - ${separated.slice(1).join(" - ")}`, "known_artist_anchor");
  }
  return variants.map(({ key, ...candidate }) => candidate);
}

export function buildRecordingResolution(parsed, sources = {}, observedAt = new Date().toISOString()) {
  const requestedArtist = String(parsed?.artist || "").trim();
  const requestedTitle = String(parsed?.title || "").trim();
  const requestedVersion = String(parsed?.mix || "").trim();
  const exactTitle = requestedVersion ? `${requestedTitle} (${requestedVersion})` : requestedTitle;
  const musicBrainzCandidates = (sources.musicBrainz || []).map((candidate) => {
    const titleExact = normalizedName(candidate.title) === normalizedName(exactTitle);
    const artistExact = (candidate.artistCredits || []).some((artist) => normalizedName(artist.name || artist) === normalizedName(requestedArtist));
    const durationDelta = Number(sources.durationMs) > 0 && Number(candidate.lengthMs) > 0 ? Math.abs(Number(sources.durationMs) - Number(candidate.lengthMs)) : null;
    const durationCompatible = durationDelta === null || durationDelta <= Math.max(10_000, Number(sources.durationMs) * 0.05);
    return { ...candidate, titleExact, artistExact, durationDelta, durationCompatible, accepted: titleExact && artistExact && durationCompatible && Number(candidate.sourceScore || 0) >= 70 };
  }).sort((left, right) => Number(right.accepted) - Number(left.accepted) || Number(right.sourceScore || 0) - Number(left.sourceScore || 0));
  const accepted = musicBrainzCandidates.filter(({ accepted }) => accepted);
  const discogsCandidates = (sources.discogs || []).map((candidate) => {
    const parts = String(candidate.title || "").split(/\s+(?:-|–|—)\s+/).map((part) => part.trim()).filter(Boolean);
    const candidateArtist = candidate.artist || (parts.length > 1 ? parts[0] : "");
    const candidateTitle = candidate.trackTitle || (parts.length > 1 ? parts.slice(1).join(" - ") : candidate.title || "");
    const artistExact = normalizedName(candidateArtist) === normalizedName(requestedArtist);
    const baseTitleExact = normalizedName(candidateTitle) === normalizedName(requestedTitle);
    const versionPresent = !requestedVersion || normalizedName(candidateTitle).includes(normalizedName(requestedVersion));
    const exactCombinedTitle = normalizedName(candidateTitle) === normalizedName(exactTitle);
    return {
      ...candidate,
      artistExact,
      baseTitleExact,
      titleExact: exactCombinedTitle || (baseTitleExact && versionPresent),
      versionPresent,
      baseCorroborates: artistExact && baseTitleExact,
      corroborates: artistExact && (exactCombinedTitle || (baseTitleExact && versionPresent))
    };
  }).sort((left, right) => Number(right.corroborates) - Number(left.corroborates) || Number(right.year || 0) - Number(left.year || 0));
  const evidence = [
    ...(accepted.length === 1 ? [{ source: "musicbrainz", basis: "exact_artist_title_duration", id: accepted[0].id }] : []),
    ...discogsCandidates.filter(({ corroborates }) => corroborates).slice(0, 3).map(({ id }) => ({ source: "discogs", basis: "exact_catalogue_artist_title", id })),
    ...discogsCandidates.filter(({ baseCorroborates, corroborates }) => baseCorroborates && !corroborates).slice(0, 3).map(({ id }) => ({ source: "discogs", basis: "base_artist_title_only", id })),
    ...(sources.bandcamp?.url ? [{ source: sources.bandcamp.source || "bandcamp", basis: "artist_profile_only", url: sources.bandcamp.url }] : [])
  ];
  return {
    type: "recording",
    parsed,
    status: accepted.length === 1 ? "resolved" : accepted.length > 1 ? "ambiguous" : musicBrainzCandidates.length ? "candidates" : "not_found",
    resolved: accepted.length === 1 ? accepted[0] : null,
    candidates: musicBrainzCandidates,
    discogsCandidates,
    evidence,
    corroboration: {
      musicbrainz: accepted.length === 1 ? "resolved" : accepted.length > 1 ? "ambiguous" : "not_resolved",
      discogs: discogsCandidates.some(({ corroborates }) => corroborates)
        ? "catalogue_match"
        : discogsCandidates.some(({ baseCorroborates }) => baseCorroborates)
          ? "base_catalogue_match"
          : discogsCandidates.length ? "candidates_only" : "none",
      bandcamp: sources.bandcamp?.url ? "artist_profile_only" : "none"
    },
    sourceStates: sources.sourceStates || {},
    observedAt
  };
}
