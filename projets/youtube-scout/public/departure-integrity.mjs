// Agreement between catalogues is not evidence about a video's performer.
const values = value => Array.isArray(value) ? value : Object.values(value || {});
const snapshots = new WeakSet();
export const isDepartureRoutingSnapshot = graph => snapshots.has(graph);
function freezeTree(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeTree(child);
  return Object.freeze(value);
}
/** Opt-in immutable read snapshot. Mutable callers are never memoized: a
 * correction or rejected edge must take effect even when edited in place. */
export function departureRoutingSnapshot(graph = {}) {
  if (snapshots.has(graph)) return graph;
  const copy = structuredClone(graph);
  const result = departureRoutingGraph(copy);
  freezeTree(result);
  snapshots.add(result);
  return result;
}
export const DEPARTURE_POLICY = 2;
export function departureRevision(entity) {
  return String(entity?.departureCorrection?.revision || "");
}
export function reviewedVideo(video, entity) {
  const correction = entity?.departureCorrection;
  return { ...video, ...(correction?.source === "user" ? {
    title: correction.title, artist: correction.artist,
    artistInference: { name: correction.artist, confidence: 1, basis: "personal_correction" }
  } : {}), departureRevision: departureRevision(entity) };
}
export function correctionDelta(graph, seed, { title, artist, revision }) {
  title = String(title || "").normalize("NFC").trim();
  artist = String(artist || "").normalize("NFC").trim();
  if (!title || title.length > 300 || artist.length > 300 || !revision) throw new Error("Renseignez un titre (300 caractères maximum) et, si connu, son artiste.");
  const entity = graph.entities?.[seed?.id];
  if (!entity || !["video", "track", "recording"].includes(entity.type)) throw new Error("Ce départ n’est pas un morceau disponible.");
  return { entities: [{ ...entity, departureCorrection: { title, artist, originalTitle: entity.departureCorrection?.originalTitle || entity.title || "", revision: String(revision), source: "user" },
    departureArtist: { name: artist, source: "user" } }], edges: [] };
}
export function groundedIdentity(identity, recording) {
  return Boolean(identity?.externalIds?.musicbrainz && recording?.resolved?.artistCredits?.some(credit =>
    credit.id && String(credit.id) === String(identity.externalIds.musicbrainz)));
}
/** Non-destructive projection, including legacy edges. No joins by name and
 * no removal of catalogue facts useful to another departure. */
export function departureRoutingGraph(graph = {}) {
  if (snapshots.has(graph)) return graph;
  const entities = Object.fromEntries(values(graph.entities).map(entity => [entity.id, entity]));
  const raw = values(graph.edges);
  const current = edge => !["probable_artist", "embodies"].includes(edge.kind) ||
    !departureRevision(entities[edge.from]) || edge.departureRevision === departureRevision(entities[edge.from]);
  const recordings = new Map(), credited = new Map();
  for (const edge of raw) if (edge.kind === "embodies" && current(edge) && ["resolved", "confirmed_user"].includes(edge.status)) {
    if (!recordings.has(edge.from)) recordings.set(edge.from, new Set());
    recordings.get(edge.from).add(edge.to);
  }
  for (const edge of raw) if (edge.kind === "credited_on" && ["observed", "resolved", "confirmed_user"].includes(edge.status)) {
    if (!credited.has(edge.to)) credited.set(edge.to, new Set());
    credited.get(edge.to).add(edge.from);
  }
  const equivalent = (a, b) => a === b || ["musicbrainz", "discogs"].some(source =>
    entities[a]?.externalIds?.[source] && String(entities[a].externalIds[source]) === String(entities[b]?.externalIds?.[source]));
  const entries = Array.isArray(graph.edges) ? graph.edges.map((edge, index) => [edge.id || String(index), edge]) : Object.entries(graph.edges || {});
  const edges = Object.fromEntries(entries.map(([key, edge]) => {
    let projected = edge;
    if (!current(edge)) projected = { ...edge, status: "candidate", integrityReason: "departure_revised" };
    else if (edge.kind === "same_identity" && [edge.from, edge.to].some(id => id.startsWith("artist:local:")) && !edge.evidence?.includes("user_confirmation")) {
      projected = { ...edge, status: "candidate", integrityReason: "local_name_not_identifier" };
    }
    else if (edge.kind === "probable_artist" && ["confirmed_cross_id", "corroborated"].includes(edge.status)) {
      const supported = [...(recordings.get(edge.from) || [])].some(id => [...(credited.get(id) || [])].some(artist => equivalent(artist, edge.to)));
      if (!supported) projected = { ...edge, status: "candidate", integrityReason: "performer_not_established" };
    }
    return [key, projected];
  }));
  return { ...graph, entities, edges };
}
