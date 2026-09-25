// Search suggestions are choices, never evidence that a video has this artist.
const values = value => Array.isArray(value) ? value : Object.values(value || {});
const key = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
const validId = (source, id) => (source === "discogs" ? /^[1-9]\d*$/ : source === "musicbrainz" ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i : /(?!) /).test(String(id || ""));
export const MANUAL_DEPARTURE_EVIDENCE = "explicit_departure_artist_v1";

// A personal annotation is scoped to one departure. It is NOT an artist node,
// an external identifier, or a name-based identity join.
export function declaredDepartureArtist(graph = {}, seedId) {
  const declaration = graph.entities?.[seedId]?.departureArtist;
  return declaration?.source === "user" && typeof declaration.name === "string"
    ? declaration.name.trim().slice(0, 300) : "";
}

// Explicit batch choice for a recording, never a merge of artist identities.
// Preserve the complete personal credit even if only a subset is resolved.
export function departureArtistsUpdate(graph, seed, name, candidates = []) {
  name = String(name || "").normalize("NFC").trim();
  if (!name || name.length > 300) throw new Error("Renseignez les artistes (300 caractères maximum).");
  const entity = graph.entities?.[seed?.id];
  if (!entity) throw new Error("Ce morceau n’est plus disponible. Rouvrez le départ.");
  const choices = [...new Map(candidates.map(candidate => [candidate.id, candidate])).values()];
  if (!choices.length || choices.some(candidate => candidate.entity?.id !== candidate.id || candidate.entity?.type !== "artist")) throw new Error("Choisissez au moins une fiche artiste valide.");
  const selected = new Set(choices.flatMap(candidate => candidate.equivalentIds || [candidate.id]));
  const edges = values(graph.edges).filter(edge => edge.from === seed.id && edge.kind === "probable_artist" && edge.status === "confirmed_user" && !selected.has(edge.to))
    .map(edge => ({ ...edge, status: "rejected_user", evidence: [...(edge.evidence || []), "user_rejection"] }));
  for (const candidate of choices) edges.push({ from: seed.id, to: candidate.id, kind: "probable_artist", status: "confirmed_user", departureRevision: entity.departureCorrection?.revision || "", evidence: ["user_confirmation", MANUAL_DEPARTURE_EVIDENCE] });
  return { entities: [{ ...entity, departureArtist: { name, source: "user" } }, ...choices.map(candidate => candidate.entity)], edges };
}

export function departureArtistUpdate(graph, seed, name, candidate = null) {
  name = String(name || "").normalize("NFC").trim();
  if (!name || name.length > 300) throw new Error("Saisissez les noms d’artistes (1 à 300 caractères).");
  const entity = graph.entities?.[seed?.id];
  if (!entity) throw new Error("Ce morceau n’est plus disponible. Rouvrez le départ.");
  const equivalent = new Set(candidate?.equivalentIds || (candidate ? [candidate.id] : []));
  const edges = values(graph.edges).filter(edge => edge.from === seed.id && edge.kind === "probable_artist" && edge.status === "confirmed_user"
    && (candidate ? !equivalent.has(edge.to) : String(graph.entities?.[edge.to]?.name || "").normalize("NFC").trim() !== name))
    .map(edge => ({ ...edge, status: "rejected_user", evidence: [...(edge.evidence || []), "user_rejection"] }));
  if (candidate) edges.push({ from: seed.id, to: candidate.id, kind: "probable_artist", status: "confirmed_user", departureRevision: entity.departureCorrection?.revision || "", evidence: ["user_confirmation", MANUAL_DEPARTURE_EVIDENCE] });
  return { entities: [{ ...entity, departureArtist: { name, source: "user" } }, ...(candidate ? [candidate.entity] : [])], edges };
}

export function artistSearchHint(title = "") {
  const quoted = String(title).match(/^["“«].+?["”»]\s*[-–—]\s*(.+?)(?:\s+[-–—]\s+|$)/u);
  const separated = String(title).match(/^(.+?)\s+[-–—]\s+.+$/u);
  return String(quoted?.[1] || separated?.[1] || "").trim().slice(0, 120);
}

/** A departure keeps its selected kind. A playlist/label is never a song
 * waiting for an artist, and a local artist name is not a catalogue identity. */
export function typedDepartureModel({ seed = {}, graph = {}, suggestion = null } = {}) {
  const type = seed.type || "track";
  const container = ["playlist", "label", "channel"].includes(type);
  const entity = values(graph.entities).find(item => item.id === seed.id) || seed;
  const encoded = String(seed.id || "").match(new RegExp(`^${type}:(discogs|musicbrainz):(.+)$`));
  const catalogueKnown = ["artist", "label"].includes(type) && ["discogs", "musicbrainz"].some(source =>
    validId(source, entity.externalIds?.[source] || seed.externalIds?.[source] || (encoded?.[1] === source ? encoded[2] : "")));
  const declared = declaredDepartureArtist(graph, seed.id);
  return {
    type, container, catalogueKnown,
    identityForm: container ? "none" : type === "artist" ? "artist" : "recording",
    initialArtistName: container ? "" : type === "artist" ? String(entity.name || seed.name || seed.label || "").trim()
      : declared || (suggestion?.confidence >= .95 ? suggestion.name : "") || artistSearchHint(seed.label) || suggestion?.name || "",
    retryLabel: ({ playlist: "Explorer les liens de cette playlist", label: "Explorer le catalogue du label", channel: "Explorer les publications de cette chaîne", artist: "Rechercher les fiches de cet artiste" })[type] || "Réessayer l’identification du morceau"
  };
}

/** Exact membership only. No artist-name/label-name joining, no catalogue
 * requests, and no mutation of the user's collection. */
export function localDepartureMembers({ seed = {}, graph = {}, library = [] } = {}) {
  if (!["playlist", "label", "channel"].includes(seed.type)) return [];
  const entities = new Map(values(graph.entities).map(item => [item.id, item]));
  const edges = values(graph.edges).filter(edge => !["candidate", "unresolved", "rejected_user", "inferred", "local_hypothesis"].includes(edge.status));
  const ids = new Set();
  if (seed.type === "playlist" || seed.type === "channel") {
    const kind = seed.type === "playlist" ? "included_in" : "published_by";
    for (const edge of edges) if (edge.kind === kind && [edge.from, edge.to].includes(seed.id)) ids.add(edge.from === seed.id ? edge.to : edge.from);
    for (const video of library) {
      if (seed.type === "playlist" && (video.playlistIds || []).some(id => `playlist:youtube:${id}` === seed.id)
        || seed.type === "channel" && video.channelId && `channel:youtube:${video.channelId}` === seed.id) {
        const id = `video:youtube:${video.id}`;
        ids.add(id); entities.set(id, { ...video, id, type: "video" });
      }
    }
  } else {
    const releases = new Set(edges.filter(edge => edge.kind === "issued_by" && edge.to === seed.id).map(edge => edge.from));
    for (const edge of edges) if (edge.kind === "appears_on" && releases.has(edge.to)) ids.add(edge.from);
  }
  return [...ids].map(id => entities.get(id)).filter(item => item && ["video", "recording", "track"].includes(item.type))
    .map(item => ({ ...item, id: item.id, type: item.type === "video" ? "track" : item.type,
      sourceType: item.type, label: item.title || item.name || item.label || item.id }));
}

const nameKey = value => key(value).replace(/\s*\(\d+\)$/, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
export function artistChoiceRank(entity, query) {
  const q = nameKey(query), name = nameKey(entity.name || entity.label);
  if (!q || !name) return 0;
  if (q === name) return 3;
  if ((entity.aliases || []).some(alias => nameKey(typeof alias === "string" ? alias : alias.name) === q)) return 2;
  // Short names are not substrings: TH is neither The Black Tone nor Dj.Booth.
  if (q.replace(/\s/g, "").length <= 3) return 0;
  const words = name.split(" ");
  return q.split(" ").every(token => words.includes(token)) ? 1 : 0;
}

export function catalogueArtistReference(value) {
  try {
    const url = new URL(String(value).trim());
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    const source = /^(?:www\.)?discogs\.com$/.test(url.hostname) ? "discogs" : url.hostname === "musicbrainz.org" ? "musicbrainz" : "";
    const id = url.pathname.match(source === "discogs" ? /^\/(?:[a-z]{2}\/)?artist\/(\d+)(?:-[^/]*)?\/?$/ : /^\/artist\/([0-9a-f-]+)\/?$/i)?.[1];
    return validId(source, id) ? { source, id } : null;
  } catch { return null; }
}

export function catalogueArtistChoices(graph = {}, query = "", registry = null) {
  const tokens = key(query).trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const entities = [...values(graph.entities)];
  for (const claim of registry?.claims || []) {
    if (claim.field !== "name" || !["discogs", "musicbrainz"].includes(claim.source)) continue;
    entities.push({ id: `artist:${claim.source}:${claim.sourceId}`, type: "artist", name: claim.value, externalIds: { [claim.source]: claim.sourceId } });
  }
  const choices = new Map();
  for (const entity of entities) {
    const rank = artistChoiceRank(entity, query);
    if (entity.type !== "artist" || !rank) continue;
    for (const source of ["discogs", "musicbrainz"]) {
      const encoded = entity.id?.match(new RegExp(`^artist:${source}:(.+)$`));
      const id = String(entity.externalIds?.[source] || encoded?.[1] || "");
      if (!validId(source, id)) continue;
      const exactKey = `${source}:${id}`;
      if (choices.has(exactKey)) continue;
      choices.set(exactKey, { id: entity.id, name: entity.name || entity.label, source, sourceId: id, rank,
        context: [entity.disambiguation, entity.country, entity.typeDetail].filter(Boolean).join(" · "),
        sourceUrl: source === "discogs" ? `https://www.discogs.com/artist/${id}` : `https://musicbrainz.org/artist/${id}`,
        entity: { id: entity.id, type: "artist", name: entity.name || entity.label, externalIds: { ...entity.externalIds, [source]: id } } });
    }
  }
  // Group catalogue cards only by exact identifiers / documented identity
  // edges, never by their shared display name (homonyms remain separate).
  const parent = new Map();
  const root = id => { if (!parent.has(id)) parent.set(id, id); const p = parent.get(id); if (p !== id) parent.set(id, root(p)); return parent.get(id); };
  const join = (a, b) => parent.set(root(a), root(b));
  const exact = new Map();
  const catalogueIds = new Set();
  for (const entity of entities) for (const [source, id] of Object.entries(entity.externalIds || {})) {
    if (entity.type !== "artist" || !validId(source, id)) continue;
    catalogueIds.add(entity.id);
    const key = `${source}:${id}`;
    if (exact.has(key)) join(entity.id, exact.get(key)); else exact.set(key, entity.id);
  }
  for (const edge of values(graph.edges)) if (edge.kind === "same_identity" && catalogueIds.has(edge.from) && catalogueIds.has(edge.to) && ["confirmed_cross_id", "confirmed_user", "corroborated"].includes(edge.status)) join(edge.from, edge.to);
  const groups = new Map();
  for (const choice of choices.values()) {
    const id = root(choice.id), group = groups.get(id) || [];
    group.push(choice); groups.set(id, group);
  }
  const equivalents = new Map();
  for (const id of parent.keys()) { const r = root(id), members = equivalents.get(r) || []; members.push(id); equivalents.set(r, members); }
  return [...groups.entries()].sort((a, b) => Math.max(...b[1].map(c => c.rank)) - Math.max(...a[1].map(c => c.rank))).slice(0, 12).map(([id, group]) => {
    const preferred = group.find(item => item.source === "discogs") || group[0];
    return { ...preferred, catalogues: group.map(({ source, sourceId, sourceUrl }) => ({ source, sourceId, sourceUrl })),
      equivalentIds: equivalents.get(id) || [preferred.id] };
  });
}

export function hasExplicitDepartureArtist(graph = {}, seedId) {
  return values(graph.edges).some(edge => edge.from === seedId && edge.kind === "probable_artist" &&
    edge.status === "confirmed_user" && edge.evidence?.includes(MANUAL_DEPARTURE_EVIDENCE));
}

export function departureWorkflow({ seed = null, dossier = null, guidance = {}, busy = false, items = [] } = {}) {
  if (!seed?.id) return "choose";
  if (guidance.state === "review") return "identify";
  if (busy || guidance.state === "loading") return "loading";
  if (items.length) return "results";
  if (["playlist", "label", "channel"].includes(seed.type)) return "search";
  // The correction form and route controls must agree even before the first
  // identification response. A label/playlist does not require an artist.
  if (!guidance.identityConfirmed && ["track", "video", "recording", "artist"].includes(seed.type)
    && ["needs_enrichment", "source_unavailable"].includes(guidance.state)) return "identify";
  if (!guidance.identityConfirmed && dossier?.suppressWeakIdentityCandidates) return "identify";
  if (guidance.state === "needs_confirmation") return "identify";
  return "search";
}
