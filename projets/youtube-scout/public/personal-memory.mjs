// Only deliberate identity decisions cross a departure boundary. Never follow
// their catalogue neighbours, even when an old backup contains those neighbours.
const values = value => Array.isArray(value) ? value : Object.values(value || {});
export function personalGraph(graph = {}, seedId = "") {
  const source = new Map(values(graph.entities).map(entity => [entity.id, entity]));
  const edges = values(graph.edges).filter(edge =>
    (!seedId || edge.from === seedId) &&
    ["probable_artist", "same_identity"].includes(edge.kind) &&
    ["confirmed_user", "rejected_user"].includes(edge.status));
  const ids = new Set(edges.flatMap(edge => [edge.from, edge.to]));
  for (const entity of source.values()) if ((!seedId || entity.id === seedId) &&
    (entity.departureCorrection?.source === "user" || entity.departureArtist?.source === "user")) ids.add(entity.id);
  const entities = [...ids].flatMap(id => {
    const entity = source.get(id);
    if (!entity) return [];
    // Whitelist: no automatically resolved artist, tags or neighbourhood.
    return [Object.fromEntries(["id", "type", "title", "name", "url", "externalIds", "departureCorrection", "departureArtist"]
      .filter(key => entity[key] !== undefined).map(key => [key, structuredClone(entity[key])]))];
  });
  return { entities, claims: [], edges: structuredClone(edges) };
}

export function personalBackup(payload) {
  const copy = structuredClone(payload);
  copy.graph = personalGraph(copy.graph);
  for (const key of ["activeDig", "presented", "seen"]) delete copy.local[key];
  copy.indexed.entities = [];
  copy.indexed.events = (copy.indexed.events || []).filter(event => event.kind !== "opened");
  copy.indexed.sync = (copy.indexed.sync || []).filter(([key]) => key !== "youtube-active-dig");
  copy.navigation = Object.fromEntries(["mission", "seedType", "depth", "directions", "maxDuration", "hideSeen", "selectedPlaylistIds"]
    .filter(key => copy.navigation?.[key] !== undefined).map(key => [key, copy.navigation[key]]));
  return copy;
}
