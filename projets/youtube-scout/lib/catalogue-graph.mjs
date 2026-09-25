import { departureRoutingGraph, isDepartureRoutingSnapshot } from "./departure-integrity.mjs";
// Exact catalogue identifiers are the only keys used here. Names are display
// values; neither lookups nor graph joins use name equality.
export const CATALOGUE_DIRECTIONS = Object.freeze(["label", "remix", "featuring", "compilation", "alias", "curator", "scene", "era"]);
const LABELS = { label: "Chez ce label", remix: "Par ce remixeur", featuring: "Avec ce partenaire", compilation: "Sur cette compilation", alias: "Autre projet", curator: "Sur cette chaîne", scene: "Territoire documenté", era: "Période de sortie" };
const MAIN = new Set(["credited_on", "primary_artist", "credited_on_release"]);
const RELEASE = new Set(["release", "release_group", "master"]);
const UNSAFE = new Set(["candidate", "unresolved", "local_hypothesis", "inferred", "rejected_user"]);
const clean = (value = "") => String(value).trim();
const label = (node = {}) => node.name || node.title || node.id || "";

function isRoutingLabel(node = {}) {
  const value = clean(label(node)).toLocaleLowerCase("en-US");
  return !["[no label]", "no label", "not on label"].includes(value);
}
const nodeId = (type, source, id) => `${type}:${source}:${id}`;
const sourceUrl = (source, type, id) => source === "discogs" ? `https://www.discogs.com/${type}/${id}` : `https://musicbrainz.org/${type.replaceAll("_", "-")}/${id}`;
const validId = (source, id) => source === "discogs" ? /^\d{1,12}$/.test(String(id)) : /^[a-f0-9-]{36}$/i.test(String(id));
const immutableIndexes = new WeakMap();

export function graphIndex(graph = {}) {
  if (immutableIndexes.has(graph)) return immutableIndexes.get(graph);
  const snapshot = graph;
  graph = departureRoutingGraph(graph);
  const entities = Array.isArray(graph.entities) ? Object.fromEntries(graph.entities.map((node) => [node.id, node])) : { ...(graph.entities || {}) };
  const edges = Array.isArray(graph.edges) ? graph.edges : Object.values(graph.edges || {});
  const adjacency = new Map();
  for (const edge of edges) {
    if (!entities[edge.from] || !entities[edge.to] || UNSAFE.has(edge.status) || edge.kind === "candidate_edition") continue;
    // Legacy channel-name hubs merged unrelated uploaders with the same title.
    if (edge.kind === "published_by" && [entities[edge.from], entities[edge.to]].some(node => node.type === "channel" && (node.basis === "channel_name_only" || node.id.startsWith("channel:youtube-name:")))) continue;
    if (["probable_artist", "same_identity"].includes(edge.kind) && !["confirmed_cross_id", "confirmed_user", "corroborated"].includes(edge.status)) continue;
    for (const [from, to] of [[edge.from, edge.to], [edge.to, edge.from]]) {
      if (!adjacency.has(from)) adjacency.set(from, []);
      adjacency.get(from).push({ to, edge });
    }
  }
  const index = { entities, edges, adjacency };
  // Only a deeply frozen snapshot can be reused safely. Mutable graphs used
  // by catalogue ingestion and tests are rebuilt after every change.
  if (isDepartureRoutingSnapshot(snapshot)) immutableIndexes.set(snapshot, index);
  return index;
}

function step(index, from, to, edge) {
  const reversed = edge.from !== from;
  const labels = {
    remixed_by: ["Remixé par", "Remixe"], produced_by: ["Produit par", "Produit"],
    credited_on: ["Crédité sur", "Crédite"], credited_on_release: ["Crédité sur", "Crédite"],
    issued_by: ["Publié par", "Publie"], appears_on: ["Figure sur", "Comprend"]
  };
  return { from: { id: from, type: index.entities[from].type, label: label(index.entities[from]) }, to: { id: to, type: index.entities[to].type, label: label(index.entities[to]) }, relation: edge.kind, relationLabel: labels[edge.kind]?.[Number(reversed)] || "", edgeFrom: edge.from, edgeTo: edge.to, reversed, role: edge.role || "", status: edge.status, source: edge.source || edge.evidence?.[0]?.source || edge.evidence?.[0] || "graph", sourceUrl: edge.sourceUrl || "", evidence: edge.evidence || [] };
}

function walk(index, seedId, allowed, depth = 4) {
  const found = new Map([[seedId, []]]);
  const queue = [seedId];
  for (let offset = 0; offset < queue.length; offset++) {
    const from = queue[offset];
    const path = found.get(from);
    if (path.length >= depth) continue;
    for (const { to, edge } of index.adjacency.get(from) || []) {
      if (found.has(to) || !allowed(edge, index.entities[from], index.entities[to])) continue;
      found.set(to, [...path, step(index, from, to, edge)]);
      queue.push(to);
    }
  }
  return found;
}

function startPaths(index, seedId) {
  return walk(index, seedId, (edge, from, to) => {
    if (edge.kind === "same_identity") {
      return (
        from.type === to.type &&
        ["artist", "label"].includes(from.type)
      );
    }
    if (edge.kind === "embodies") return from.type === "video" && ["recording", "track"].includes(to.type);
    if (edge.kind === "probable_artist") return from.type === "video" && to.type === "artist";
    if (edge.kind === "credited_on") return ["recording", "track"].includes(from.type) && to.type === "artist" && edge.to === from.id;
    // A playlist is an explicit collection of starting points, not an arbitrary
    // bridge between unrelated artists during later traversal.
    return edge.kind === "included_in" && from.id === seedId && from.type === "playlist" && to.type === "video";
  }, 3);
}

export function directionAnchors(index, seedId, direction) {
  const starts = startPaths(index, seedId);
  const anchors = new Map();
  const accept = (id, path) => { if (!anchors.has(id) || path.length < anchors.get(id).length) anchors.set(id, path); };
  for (const [id, prefix] of starts) {
    // A resolved track has its own release dates. Do not replace its period
    // with another era reached through the artist's later discography.
    if (direction === "era" && index.entities[id].type === "artist" && [...starts.keys()].some(key => ["recording", "track"].includes(index.entities[key].type))) continue;
    const paths = walk(index, id, (edge, from, to) => {
      if (direction === "label") return (MAIN.has(edge.kind) && from.type === "artist" && (RELEASE.has(to.type) || ["recording", "track"].includes(to.type)))
        || (edge.kind === "appears_on" && ["recording", "track"].includes(from.type) && RELEASE.has(to.type))
        || (edge.kind === "issued_by" && RELEASE.has(from.type) && to.type === "label" && isRoutingLabel(to))
        || (edge.kind === "associated_label" && to.type === "label" && isRoutingLabel(to));
      if (direction === "compilation") return (MAIN.has(edge.kind) && from.type === "artist" && (RELEASE.has(to.type) || ["recording", "track"].includes(to.type))) || (edge.kind === "appears_on" && ["recording", "track"].includes(from.type) && RELEASE.has(to.type));
      if (direction === "curator") return edge.kind === "published_by";
      if (direction === "scene") return edge.kind === "associated_scene";
      if (direction === "era") return (MAIN.has(edge.kind) && from.type === "artist" && (RELEASE.has(to.type) || ["recording", "track"].includes(to.type)))
        || (edge.kind === "appears_on" && ["recording", "track"].includes(from.type) && RELEASE.has(to.type))
        || (edge.kind === "released_in_era" && RELEASE.has(from.type) && to.type === "era");
      if (direction === "alias") return ["alias_of", "member_of", "has_member"].includes(edge.kind);
      if (direction === "remix") return MAIN.has(edge.kind) || edge.kind === "remixed_by" || edge.kind === "produced_by";
      return MAIN.has(edge.kind) || edge.kind === "featured_with";
    }, direction === "label" ? 3 : direction === "era" ? 3 : 2);
    for (const [targetId, localPath] of paths) {
      const node = index.entities[targetId];
      const targetType = { label: "label", curator: "channel", era: "era" }[direction];
      const motif = direction === "remix" ? localPath.some((entry) => ["remixed_by", "produced_by"].includes(entry.relation)) : direction === "featuring" ? localPath.some((entry) => entry.relation === "featured_with") : true;
      if (targetType ? node.type === targetType : direction === "scene" ? ["scene", "territory"].includes(node.type) : direction === "compilation" ? RELEASE.has(node.type) && /compilation|sampler|various/i.test(`${node.releaseType || ""} ${node.format || ""}`) : node.type === "artist" && localPath.length && !starts.has(targetId) && motif) accept(targetId, [...prefix, ...localPath]);
    }
  }
  return { starts, anchors };
}

function normalizePartialDate(value = "") {
  const raw = clean(value);

  // Some catalogue providers encode unknown date components with "00".
  // Preserve only the precision actually documented; never invent a month
  // or day from those placeholders.
  if (/^\d{4}-00(?:-00)?$/.test(raw)) {
    return raw.slice(0, 4);
  }

  if (/^\d{4}-(?:0[1-9]|1[0-2])-00$/.test(raw)) {
    return raw.slice(0, 7);
  }

  return raw;
}

export function releaseDates({ date = "", originalDate = "", formats = [], now = new Date().toISOString() } = {}) {
  const releaseDate = normalizePartialDate(date);
  const firstReleaseDate = normalizePartialDate(originalDate);
  const precision = /^\d{4}-\d{2}-\d{2}$/.test(releaseDate) ? "day" : /^\d{4}-\d{2}$/.test(releaseDate) ? "month" : /^\d{4}$/.test(releaseDate) ? "year" : "unknown";
  const comparison = precision === "day" ? now.slice(0, 10) : precision === "month" ? now.slice(0, 7) : now.slice(0, 4);
  return { releaseDate, firstReleaseDate, release: releaseDate, original: firstReleaseDate, precision, isReissue: /reissue|repress|remaster/i.test(formats.join(" ")), status: precision === "unknown" ? "unknown" : releaseDate > comparison ? "announced" : "released", observedAt: now };
}

function candidateFor(index, id, direction, anchor, path) {
  const node = index.entities[id];
  const credits = (index.adjacency.get(id) || []).filter(({ to, edge }) => MAIN.has(edge.kind) && index.entities[to].type === "artist").map(({ to }) => index.entities[to]);
  const artists = node.artists?.length ? node.artists : credits;
  const artist = node.artist || artists.map(label).filter(Boolean).join(" & ");
  const query = [artist, node.title || node.name].filter(Boolean).join(" ");
  const embodiedVideo = (index.adjacency.get(id) || []).find(({ to, edge }) => edge.kind === "embodies" && index.entities[to].type === "video");
  const directVideo = node.type === "video" ? node.url : node.listenUrl || (embodiedVideo && index.entities[embodiedVideo.to].url);
  const videoId = directVideo?.match(/(?:[?&]v=|youtu\.be\/)([A-Za-z0-9_-]{6,20})/)?.[1] || "";
  const releaseId = node.releaseId || (index.adjacency.get(id) || []).find(({ edge, to }) => edge.kind === "appears_on" && RELEASE.has(index.entities[to]?.type))?.to || (RELEASE.has(node.type) ? id : "");
  const catalogueSize = Number(anchor.catalogueSize || 0);
  // A transparent browsing rule, not a similarity score or artist blacklist.
  const distant = direction === "label" && catalogueSize >= 500;
  const remixCredit = direction === "remix" && path.find(entry => ["remixed_by", "produced_by"].includes(entry.relation));
  const explanation = remixCredit
    ? remixCredit.edgeTo === anchor.id
      ? `${remixCredit.relation === "remixed_by" ? "Par ce remixeur" : "Par ce producteur"} : ${label(anchor)}`
      : `Via un morceau ${remixCredit.relation === "remixed_by" ? "remixé" : "produit"} par ${label(index.entities[remixCredit.edgeTo])} : ${label(anchor)}`
    : `${LABELS[direction]} : ${label(anchor)}`;
  return {
    id, type: node.type, title: node.title || node.name, artist, artistIds: artists.map(({ id: artistId }) => artistId).filter(Boolean),
    releaseId, isrc: node.isrc || (node.isrcs?.length === 1 ? node.isrcs[0] : ""),
    recordingId: node.type === "recording" ? node.id : node.recordingId || "",
    relationship: { kind: direction === "label" ? distant ? "broad_label" : "editorial_label" : direction === "curator" ? "editorial_channel" : "documented_credit", distant, catalogueSize, message: direction === "label" ? `${distant ? `Catalogue étendu (${catalogueSize} sorties référencées). ` : ""}Label commun ; proximité musicale non établie.` : direction === "curator" ? "Même chaîne ; proximité musicale non établie." : "" },
    source: node.source || (id.includes(":discogs:") ? "discogs" : id.includes(":musicbrainz:") ? "musicbrainz" : "graph"),
    sourceUrl: node.url || "", thumbnail: node.thumbnail || "", direction, relation: direction, anchor: { id: anchor.id, label: label(anchor), type: anchor.type },
    listen: { kind: directVideo ? "video" : "search", url: directVideo || `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, query, videoId, basis: directVideo ? "source_video" : "exact_catalogue_title_artist" },
    evidence: path.flatMap((value) => [{ source: value.source, url: value.sourceUrl, relation: value.relation }]), path,
    dates: node.dates || releaseDates({ date: node.date, originalDate: node.firstReleaseDate }),
    explanation
  };
}

export function catalogueCandidates(graph, seedId, direction) {
  const index = graphIndex(graph);
  if (!index.entities[seedId]) return [];
  return candidatesFromIndex(index, seedId, direction);
}

function candidatesFromIndex(index, seedId, direction) {
  const { starts, anchors } = directionAnchors(index, seedId, direction);
  if (direction === "era") {
    // A decade is context, not an artistic relationship. Intersect the dated
    // neighbourhood with explicit catalogue/channel routes; never traverse a
    // global decade hub into unrelated accumulated searches.
    const related = new Map();
    if (!anchors.size) return [];
    for (const route of ["label", "remix", "featuring", "compilation", "alias", "curator"]) {
      for (const item of candidatesFromIndex(index, seedId, route)) {
        const dates = walk(index, item.id, (edge, from, to) =>
          (edge.kind === "appears_on" && ["recording", "track"].includes(from.type) && RELEASE.has(to.type)) ||
          (edge.kind === "released_in_era" && RELEASE.has(from.type) && to.type === "era"), 2);
        const match = [...dates].find(([id, path]) => path.length && anchors.has(id));
        if (!match || (related.has(item.id) && related.get(item.id).path.length <= item.path.length)) continue;
        const [eraId, targetPath] = match;
        const context = { label: label(index.entities[eraId]), sourcePath: anchors.get(eraId), targetPath };
        related.set(item.id, { ...item, direction: "era", relation: "era", relatedVia: route, periodContext: context,
          explanation: `${item.explanation} · période commune : ${context.label}` });
      }
    }
    return [...related.values()];
  }
  const sourceArtists = new Set([...starts.keys()].filter((id) => index.entities[id].type === "artist"));
  for (const id of starts.keys()) for (const { to, edge } of index.adjacency.get(id) || []) if (MAIN.has(edge.kind) && index.entities[to].type === "artist") sourceArtists.add(to);
  const candidates = new Map();
  if (direction === "scene" && [...anchors.keys()].some(id => index.entities[id].type === "territory")) {
    // A country is geographical context, not a documented musical scene.
    // Like a decade, it must qualify an independent relationship.
    for (const route of ["label", "remix", "featuring", "compilation", "alias", "curator"]) {
      for (const item of candidatesFromIndex(index, seedId, route)) {
        const contexts = walk(index, item.id, (edge, from, to) =>
          (MAIN.has(edge.kind) && to.type === "artist") ||
          (edge.kind === "probable_artist" && from.type === "video" && to.type === "artist") ||
          (edge.kind === "associated_scene" && from.type === "artist" && to.type === "territory"), 2);
        const match = [...contexts].find(([id, path]) => path.length && anchors.has(id));
        if (!match || (candidates.has(item.id) && candidates.get(item.id).path.length <= item.path.length)) continue;
        const [territoryId, targetPath] = match;
        const context = { label: label(index.entities[territoryId]), sourcePath: anchors.get(territoryId), targetPath };
        candidates.set(item.id, { ...item, direction: "scene", relation: "scene", relatedVia: route, territoryContext: context,
          explanation: `${item.explanation} · territoire commun : ${context.label}` });
      }
    }
  }
  for (const [anchorId, prefix] of anchors) {
    const anchor = index.entities[anchorId];
    if (direction === "scene" && anchor.type === "territory") continue;
    const downstream = walk(index, anchorId, (edge, from, to) => {
      if (direction === "label") return (edge.kind === "issued_by" && from.id === anchorId) || (edge.kind === "appears_on" && RELEASE.has(from.type) && ["recording", "track"].includes(to.type));
      if (direction === "curator") return edge.kind === "published_by" && from.id === anchorId;
      if (direction === "scene") return (edge.kind === "associated_scene" && from.id === anchorId) || MAIN.has(edge.kind);
      if (direction === "compilation") return edge.kind === "appears_on" || (MAIN.has(edge.kind) && from.id === anchorId);
      return MAIN.has(edge.kind) || edge.kind === "appears_on";
    }, 2);
    for (const [id, suffix] of downstream) {
      const node = index.entities[id];
      if (!suffix.length || starts.has(id) || prefix.some((entry) => entry.from.id === id) || candidates.has(id)) continue;
      if (!["recording", "track", "video", "release", "release_group", "master"].includes(node.type)) continue;
      // When the exact tracklist exists, show the tracks rather than the same
      // release a second time. Versions remain distinct catalogue entities.
      if (RELEASE.has(node.type) && (index.adjacency.get(id) || []).some(({ edge }) => edge.kind === "appears_on")) continue;
      const candidate = candidateFor(index, id, direction, anchor, [...prefix, ...suffix]);
      if (direction === "label" && candidate.artistIds.length && candidate.artistIds.every((artistId) => sourceArtists.has(artistId))) continue;
      candidates.set(id, candidate);
    }
  }
  return [...candidates.values()];
}


export { LABELS, MAIN, RELEASE, clean, label, nodeId, sourceUrl, validId };
