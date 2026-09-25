import { createHash } from "node:crypto";
import { departureArtistIds, artistRelation, artistRelationAllowed } from "../public/music-sorting.mjs";
import { departureRoutingGraph } from "./departure-integrity.mjs";

import { CATALOGUE_DIRECTIONS, LABELS, MAIN, RELEASE, clean, label, nodeId, sourceUrl, validId, graphIndex, directionAnchors, releaseDates, catalogueCandidates } from "./catalogue-graph.mjs";
export { CATALOGUE_DIRECTIONS, releaseDates, catalogueCandidates } from "./catalogue-graph.mjs";

/** The display policy is also a collection objective, never an evidence filter.
 * Keep this predicate aligned with the browser's artist / distant-link rules.
 * Names only exclude a visible result; they never identify or merge entities. */
export function createCatalogueEligibility({ graph = {}, seedId = "", seedArtistIds = [], seedArtist = "", otherArtistsOnly = false, includeUnknownArtists = false, includeCollaborations = false, includeDistant = true, excludeIds = [], directLinkedIds = [], excludeLibraryVideos = false } = {}) {
  const excluded = new Set(excludeIds), direct = new Set(directLinkedIds);
  const forGraph = (currentGraph = graph) => {
    const artistIds = [...new Set([...seedArtistIds, ...departureArtistIds(currentGraph, seedId)])];
    const libraryIds = new Set();
    if (excludeLibraryVideos) {
      const index = graphIndex(currentGraph);
      for (const [id, node] of Object.entries(index.entities)) {
        if (node.type === "video" && (index.adjacency.get(id) || []).some(({ to, edge }) => edge.kind === "included_in" && index.entities[to]?.type === "playlist")) libraryIds.add(id);
      }
    }
    return candidate => {
      if (excluded.has(candidate.id) || libraryIds.has(candidate.id)) return false;
      if (!includeDistant && candidate.relationship?.distant && !direct.has(candidate.id) && candidate.anchor?.id !== seedId) return false;
      if (!otherArtistsOnly) return true;
      // A collection or label has no single reference artist. Treat an unavailable
      // artist scope as inapplicable, not a reason to hide every collected track.
      if (!artistIds.length && !String(seedArtist).trim()) return true;
      return artistRelationAllowed(artistRelation(candidate, { artistIds, name: seedArtist }), { includeUnknownArtists, includeCollaborations });
    };
  };
  // Bind a single graph snapshot per candidate batch rather than rebuilding the
  // identity / library indexes once per track in a large cached catalogue.
  const predicate = (candidate, currentGraph = graph) => forGraph(currentGraph)(candidate);
  predicate.forGraph = forGraph;
  return predicate;
}

function deltaBuilder() {
  const entities = new Map(), edges = new Map();
  return {
    entity(value) { entities.set(value.id, { ...(entities.get(value.id) || {}), ...value }); return value.id; },
    edge(from, to, kind, source, url, extra = {}) { const value = { from, to, kind, status: "observed", source, sourceUrl: url, evidence: [{ source, url }], ...extra }; edges.set(`${from}:${kind}:${to}`, value); },
    result() { return { entities: [...entities.values()], edges: [...edges.values()], claims: [] }; }
  };
}

function addReleaseEra(builder, releaseId, date, source, url) {
  const year = Number(String(date || "").match(/^\d{4}/)?.[0]);
  if (!(year >= 1900 && year <= 2100)) return;
  const name = `${Math.floor(year / 10) * 10}s`;
  const id = builder.entity({ id: nodeId("era", "music-date", name), type: "era", name, basis: "catalogue_release_date" });
  builder.edge(releaseId, id, "released_in_era", source, url, { basis: "catalogue_release_date" });
}

// Order only; retain every edition and identifier. Prefer another artist and
// release before returning to an album already represented in this page.
export function diversifyCatalogueReleases(items = []) {
  const remaining = [...items], result = [], artists = new Map(), albums = new Map();
  const artistKey = item => String(item.artist || (item["artist-credit"] || item.artists || []).map(a => a.name || a.artist?.name).join(" & ")).toLocaleLowerCase();
  const albumKey = item => item.releaseId || `${artistKey(item)}:${item.title || item.id}`;
  while (remaining.length) {
    const cost = item => (artists.get(artistKey(item)) || 0) + (albums.get(albumKey(item)) || 0) * 2;
    remaining.sort((a, b) => cost(a) - cost(b));
    const item = remaining.shift(); result.push(item);
    artists.set(artistKey(item), (artists.get(artistKey(item)) || 0) + 1);
    albums.set(albumKey(item), (albums.get(albumKey(item)) || 0) + 1);
  }
  return result;
}

export function discogsReleaseGraph(release, { now } = {}) {
  const builder = deltaBuilder();
  const releaseId = nodeId("release", "discogs", release.id);
  const url = release.uri || sourceUrl("discogs", "release", release.id);
  const formats = (release.formats || []).flatMap((format) => [format.name, ...(format.descriptions || [])]).filter(Boolean);
  const artistNode = (artist) => artist?.id && builder.entity({ id: nodeId("artist", "discogs", artist.id), type: "artist", name: artist.name || artist.anv, externalIds: { discogs: String(artist.id) }, source: "discogs", url: sourceUrl("discogs", "artist", artist.id) });
  const main = (release.artists || []).map((artist) => ({ id: artistNode(artist), name: artist.name })).filter(({ id }) => id);
  const dates = releaseDates({ date: release.released || release.year || "", originalDate: release.master_year || "", formats, now });
  builder.entity({ id: releaseId, type: "release", title: release.title, artists: main, date: dates.releaseDate, dates, source: "discogs", releaseType: formats.join(" · "), format: formats.join(" · "), externalIds: { discogs: String(release.id) }, url });
  addReleaseEra(builder, releaseId, dates.firstReleaseDate || dates.releaseDate, "discogs", url);
  for (const artist of main) builder.edge(artist.id, releaseId, "credited_on_release", "discogs", url);
  for (const recordLabel of release.labels || []) {
    if (!recordLabel.id) continue;
    const id = builder.entity({ id: nodeId("label", "discogs", recordLabel.id), type: "label", name: recordLabel.name, externalIds: { discogs: String(recordLabel.id) }, source: "discogs", url: sourceUrl("discogs", "label", recordLabel.id) });
    builder.edge(releaseId, id, "issued_by", "discogs", url, { catalogueNumber: recordLabel.catno || "" });
  }
  for (const [position, track] of (release.tracklist || []).entries()) {
    if (!track.title || ["heading", "index"].includes(track.type_)) continue;
    const trackId = nodeId("track", "discogs", `${release.id}:${position}`);
    const artists = track.artists?.length ? track.artists.map((artist) => ({ id: artistNode(artist), name: artist.name })).filter(({ id }) => id) : main;
    builder.entity({ id: trackId, type: "track", title: track.title, artists, date: dates.releaseDate, dates, duration: track.duration || "", position: track.position || "", source: "discogs", url, releaseId });
    builder.edge(trackId, releaseId, "appears_on", "discogs", url);
    for (const artist of artists) builder.edge(artist.id, trackId, "credited_on", "discogs", url);
    const credits = [...(track.extraartists || []), ...(release.extraartists || []).filter((credit) => !credit.tracks || String(credit.tracks).split(/\s*,\s*/).includes(track.position))];
    for (const credit of credits) {
      const id = artistNode(credit);
      if (!id) continue;
      const kind = /remix/i.test(credit.role) ? "remixed_by" : /featur/i.test(credit.role) ? "featured_with" : /produc/i.test(credit.role) ? "produced_by" : "credited_on";
      if (kind === "credited_on") builder.edge(id, trackId, kind, "discogs", url, { role: credit.role || "" });
      else builder.edge(trackId, id, kind, "discogs", url, { role: credit.role || "" });
    }
    // A main joint credit is a documented collaboration, not an inferred feature.
    for (let left = 0; left < artists.length; left++) for (let right = left + 1; right < artists.length; right++) builder.edge(artists[left].id, artists[right].id, "featured_with", "discogs", url, { role: "joint_main_credit", trackId });
  }
  return builder.result();
}

export function musicBrainzReleaseGraph(release, { now } = {}) {
  const builder = deltaBuilder();
  const releaseId = nodeId("release", "musicbrainz", release.id);
  const url = sourceUrl("musicbrainz", "release", release.id);
  const artistNode = (credit) => { const artist = credit.artist || credit; return artist?.id && { id: builder.entity({ id: nodeId("artist", "musicbrainz", artist.id), type: "artist", name: artist.name, externalIds: { musicbrainz: artist.id }, source: "musicbrainz", url: sourceUrl("musicbrainz", "artist", artist.id) }), name: artist.name }; };
  const main = (release["artist-credit"] || []).map(artistNode).filter(Boolean);
  const group = release["release-group"] || {};
  const dates = releaseDates({ date: release.date, originalDate: group["first-release-date"], now });
  builder.entity({ id: releaseId, type: "release", title: release.title, artists: main, date: dates.releaseDate, dates, releaseType: [group["primary-type"], ...(group["secondary-types"] || [])].filter(Boolean).join(" · "), externalIds: { musicbrainz: release.id }, source: "musicbrainz", url });
  addReleaseEra(builder, releaseId, dates.firstReleaseDate || dates.releaseDate, "musicbrainz", url);
  for (const artist of main) builder.edge(artist.id, releaseId, "credited_on_release", "musicbrainz", url);
  for (const info of release["label-info"] || []) {
    if (!info.label?.id) continue;
    const id = builder.entity({ id: nodeId("label", "musicbrainz", info.label.id), type: "label", name: info.label.name, externalIds: { musicbrainz: info.label.id }, source: "musicbrainz", url: sourceUrl("musicbrainz", "label", info.label.id) });
    builder.edge(releaseId, id, "issued_by", "musicbrainz", url, { catalogueNumber: info["catalog-number"] || "" });
  }
  for (const medium of release.media || []) for (const track of medium.tracks || []) {
    const recording = track.recording || {};
    if (!recording.id) continue;
    const id = nodeId("recording", "musicbrainz", recording.id);
    const artists = (recording["artist-credit"] || track["artist-credit"] || release["artist-credit"] || []).map(artistNode).filter(Boolean);
    builder.entity({ id, type: "recording", title: recording.title || track.title, artists, duration: recording.length || track.length, isrcs: recording.isrcs || [], date: dates.releaseDate, dates, source: "musicbrainz", externalIds: { musicbrainz: recording.id }, url: sourceUrl("musicbrainz", "recording", recording.id) });
    builder.edge(id, releaseId, "appears_on", "musicbrainz", url);
    for (const artist of artists) builder.edge(artist.id, id, "credited_on", "musicbrainz", url);
    for (const relation of recording.relations || []) {
      if (relation["target-type"] !== "artist" || !relation.artist?.id) continue;
      const artist = artistNode(relation.artist);
      const kind = /remix/i.test(relation.type) ? "remixed_by" : /produc/i.test(relation.type) ? "produced_by" : /vocal|instrument/i.test(relation.type) ? "credited_on" : "";
      if (kind === "credited_on") builder.edge(artist.id, id, kind, "musicbrainz", url, { role: relation.type });
      else if (kind) builder.edge(id, artist.id, kind, "musicbrainz", url, { role: relation.type });
    }
    for (let left = 0; left < artists.length; left++) for (let right = left + 1; right < artists.length; right++) builder.edge(artists[left].id, artists[right].id, "featured_with", "musicbrainz", url, { role: "joint_main_credit", recordingId: id });
  }
  return builder.result();
}

function mergeGraph(graph, delta) {
  for (const entity of delta.entities || []) graph.entities[entity.id] = { ...(graph.entities[entity.id] || {}), ...entity };
  for (const edge of delta.edges || []) graph.edges[`${edge.from}:${edge.kind}:${edge.to}`] = edge;
}


function structuredRelatedUrls(entity = {}, source = "") {
  if (source === "musicbrainz") {
    return (entity.relations || [])
      .filter(
        relation =>
          relation?.["target-type"] === "url" ||
          relation?.url?.resource
      )
      .map(relation => relation?.url?.resource)
      .filter(Boolean);
  }

  return Array.isArray(entity.urls)
    ? entity.urls.filter(Boolean)
    : [];
}

function structuredCrossIdGraph(
  builder,
  {
    entity,
    source,
    entityType,
    localId,
    displayName = ""
  }
) {
  if (!["artist", "label"].includes(entityType)) {
    return;
  }

  const targetSource =
    source === "musicbrainz"
      ? "discogs"
      : source === "discogs"
        ? "musicbrainz"
        : "";

  if (!targetSource) return;

  const allowedHosts =
    targetSource === "discogs"
      ? new Set(["discogs.com", "www.discogs.com"])
      : new Set(["musicbrainz.org", "www.musicbrainz.org"]);

  for (const relatedUrl of structuredRelatedUrls(entity, source)) {
    let parsed;

    try {
      parsed = new URL(relatedUrl);
    } catch {
      continue;
    }

    if (parsed.protocol !== "https:") continue;
    if (!allowedHosts.has(parsed.hostname.toLowerCase())) continue;

    const escapedType = entityType.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const targetId =
      targetSource === "discogs"
        ? parsed.pathname.match(
            new RegExp(
              `^/(?:[a-z]{2}/)?${escapedType}/(\\d{1,12})(?:-[^/]*)?/?$`,
              "i"
            )
          )?.[1]
        : parsed.pathname.match(
            new RegExp(
              `^/${escapedType}/([0-9a-f-]{36})/?$`,
              "i"
            )
          )?.[1];

    if (!targetId || !validId(targetSource, targetId)) continue;

    const target = builder.entity({
      id: nodeId(
        entityType,
        targetSource,
        targetId
      ),
      type: entityType,
      name: displayName || entity.name || "",
      externalIds: {
        [targetSource]: String(targetId)
      },
      source: targetSource,
      url: sourceUrl(
        targetSource,
        entityType,
        targetId
      )
    });

    const profileUrl = sourceUrl(
      source,
      entityType,
      entity.id
    );

    builder.edge(
      localId,
      target,
      "same_identity",
      source,
      profileUrl,
      {
        status: "confirmed_cross_id",
        evidence: [
          {
            source,
            url: profileUrl,
            relatedUrl: parsed.href,
            basis: `structured_${entityType}_url`
          }
        ]
      }
    );
  }
}

function artistGraph(artist, source, existing) {
  const builder = deltaBuilder();
  const id = builder.entity({ id: nodeId("artist", source, artist.id), type: "artist", name: artist.name, externalIds: { [source]: String(artist.id) }, source, url: sourceUrl(source, "artist", artist.id) });
  // Link the canonical local registry only when its stored external ID is equal.
  if (existing && existing.id !== id) builder.edge(existing.id, id, "same_identity", source, sourceUrl(source, "artist", artist.id), { status: "confirmed_cross_id" });
  const relationships = source === "discogs" ? [...(artist.aliases || []).map((entry) => ({ artist: entry, kind: "alias_of" })), ...(artist.groups || []).map((entry) => ({ artist: entry, kind: "member_of" })), ...(artist.members || []).map((entry) => ({ artist: entry, kind: "has_member" }))] : (artist.relations || []).filter((entry) => entry.artist?.id && /member of band|is person|collaboration/i.test(entry.type)).map((entry) => ({ artist: entry.artist, kind: entry.direction === "backward" ? "has_member" : "member_of" }));
  for (const relation of relationships) {
    if (!relation.artist.id) continue;
    const target = builder.entity({ id: nodeId("artist", source, relation.artist.id), type: "artist", name: relation.artist.name, externalIds: { [source]: String(relation.artist.id) }, source, url: sourceUrl(source, "artist", relation.artist.id) });
    builder.edge(id, target, relation.kind, source, sourceUrl(source, "artist", artist.id));
  }
  structuredCrossIdGraph(builder, {
    entity: artist,
    source,
    entityType: "artist",
    localId: id,
    displayName: artist.name
  });
  return builder.result();
}

function labelProfileGraph(recordLabel, source, existing) {
  const builder = deltaBuilder();

  const id = builder.entity({
    id: nodeId("label", source, recordLabel.id),
    type: "label",
    name: recordLabel.name || "",
    externalIds: {
      [source]: String(recordLabel.id)
    },
    source,
    url: sourceUrl(
      source,
      "label",
      recordLabel.id
    )
  });

  /*
   * Un registre local déjà porteur du même identifiant externe peut être relié
   * directement : l'identifiant fournisseur, et non le nom, constitue ici la
   * preuve.
   */
  if (existing && existing.id !== id) {
    builder.edge(
      existing.id,
      id,
      "same_identity",
      source,
      sourceUrl(source, "label", recordLabel.id),
      {
        status: "confirmed_cross_id"
      }
    );
  }

  structuredCrossIdGraph(builder, {
    entity: recordLabel,
    source,
    entityType: "label",
    localId: id,
    displayName: recordLabel.name
  });

  return builder.result();
}

function taskKey(task) { return `${task.source}:${task.type}:${task.id}:${task.page || 1}`; }

function catalogueTaskPriority(task) {
  // Finish one meaningful route before opening the next catalogue page. In
  // particular a newly identified label must outrank the artist's remaining
  // albums, and a release found at that label must outrank its next page.
  if (task.purpose === "destination_edition") return task.type === "release" ? 150 : 145;
  if (task.type === "label_profile") return 155;
  if (task.type === "label") return Number(task.page || 1) === 1 ? 140 : 100;
  if (task.purpose === "destination_catalogue") return 130;
  if (task.type === "artist") return 80;
  if (task.type === "release") return 70;
  if (["master", "recording", "release_group"].includes(task.type)) return 65;
  return Number(task.page || 1) === 1 ? 40 : 10;
}

function pendingArtistConfirmations(graph, seedId) {
  const edges = Array.isArray(graph.edges) ? graph.edges : Object.values(graph.edges || {});
  const confirmed = edges.some((edge) => edge.from === seedId && edge.kind === "probable_artist" && ["confirmed_cross_id", "confirmed_user", "corroborated"].includes(edge.status));
  if (confirmed) return [];
  const results = new Map();
  for (const edge of edges) {
    if (edge.from !== seedId || edge.kind !== "probable_artist") continue;
    const artist = graph.entities[edge.to];
    if (!artist || artist.type !== "artist") continue;
    const source = ["musicbrainz", "discogs"].find((provider) => validId(provider, artist.externalIds?.[provider]));
    if (!source) continue;
    const sourceId = String(artist.externalIds[source]);
    results.set(artist.id, { id: artist.id, name: label(artist), source, sourceId, sourceUrl: sourceUrl(source, "artist", sourceId) });
  }
  return [...results.values()];
}

function decodeCursor(value, seedId, direction, revision = "") {
  if (!value) return { seedId, direction, seen: [], done: [], queue: [] };
  try {
    if (String(value).length > 2_000_000) throw new Error();
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (parsed.seedId !== seedId || parsed.direction !== direction || !Array.isArray(parsed.seen) || !Array.isArray(parsed.done) || !Array.isArray(parsed.queue)) throw new Error();
    if (parsed.policy !== 2 || parsed.revision !== revision) return { seedId, direction, seen: [], done: [], queue: [] };
    for (const task of parsed.queue) if (!["discogs", "musicbrainz"].includes(task.source) || !["artist", "artist_releases", "release", "release_group", "master", "label", "label_profile", "recording"].includes(task.type) || !validId(task.source, task.id) || Number(task.page || 1) < 1 || Number(task.page || 1) > 10_000) throw new Error();
    return parsed;
  } catch { const error = new Error("Curseur de catalogue invalide."); error.httpStatus = 400; throw error; }
}

function planTasks(graph, seedId, direction) {
  const index = graphIndex(graph);
  const { starts, anchors } = directionAnchors(index, seedId, direction);
  const multipleArtists = [...starts.keys()].filter(id => index.entities[id].type === "artist").length > 1;
  const tasks = [];
  const add = (node, type, purpose = "") => { for (const source of ["discogs", "musicbrainz"]) if (validId(source, node.externalIds?.[source])) tasks.push({ source, type, id: node.externalIds[source], page: 1, purpose, ...(purpose.startsWith("destination") || (multipleArtists && node.type === "artist") ? { branch: node.id } : {}) }); };
  if (["curator", "scene", "era"].includes(direction)) return tasks;
  for (const id of anchors.keys()) {
    const node = index.entities[id];
    if (node.type === "label") {
      /*
       * Le profil MusicBrainz est une étape d'identité :
       * ses url-rels peuvent déclarer explicitement l'ID Discogs du label.
       *
       * On ne symétrise pas artificiellement cette requête côté Discogs :
       * le catalogue Discogs doit rester directement explorable et un profil
       * Discogs ne doit pas consommer le budget avant /labels/:id/releases.
       */
      if (validId("musicbrainz", node.externalIds?.musicbrainz)) {
        tasks.push({
          source: "musicbrainz",
          type: "label_profile",
          id: node.externalIds.musicbrainz,
          page: 1,
          purpose: "identity_bridge"
        });
      }

      add(node, "label");
    }
    else if (node.type === "artist") { add(node, "artist", "destination_catalogue"); add(node, "artist_releases", "destination_catalogue"); }
    else if (RELEASE.has(node.type)) add(node, node.type, "destination_edition");
  }
  const actionableAnchor = [...anchors.keys()].some((id) => ["discogs", "musicbrainz"].some((source) => validId(source, index.entities[id].externalIds?.[source])));
  // Exact seed editions reveal label IDs and track-level credits. Only when
  // those are absent do we browse the identified artist's own releases.
  const startEditions = new Map();
  for (const [id] of starts) {
    const node = index.entities[id];
    if (RELEASE.has(node.type)) startEditions.set(id, node);
    for (const { to, edge } of index.adjacency.get(id) || []) if ((edge.kind === "appears_on" || MAIN.has(edge.kind)) && RELEASE.has(index.entities[to].type)) startEditions.set(to, index.entities[to]);
    if (node.type === "recording" && direction !== "alias") add(node, "recording");
    if (node.type === "artist") {
      add(node, "artist");
      const ownAnchor = multipleArtists ? [...anchors.values()].some(path => path.some(step => step.from?.id === id || step.to?.id === id)) : actionableAnchor;
      if (!ownAnchor && direction !== "alias") add(node, "artist_releases");
    }
  }
  if (direction !== "alias") for (const node of [...startEditions.values()].slice(0, 8)) add(node, node.type);
  return tasks;
}

/** A request does bounded work. The cursor preserves unfinished source pages;
 * empty results never mean a catalogue has been completely searched. */
export async function exploreCatalogueBranch({ graph, seedId, direction, cursor = "", limit = 12, request, readCached, configured = {}, requestBudget = 5, candidateEligible, minimumEligible = 1 }) {
  graph = departureRoutingGraph(graph);
  if (!CATALOGUE_DIRECTIONS.includes(direction)) { const error = new Error("Direction de fouille invalide."); error.httpStatus = 400; throw error; }
  const state = { entities: { ...(graph.entities || {}) }, edges: { ...(graph.edges || {}) } };
  if (!state.entities[seedId]) { const error = new Error("Point de départ absent du graphe."); error.httpStatus = 404; throw error; }
  const revision = String(graph.entities?.[seedId]?.departureCorrection?.revision || "");
  const progress = decodeCursor(cursor, seedId, direction, revision);
  const branchReads = Object.fromEntries(Object.entries(progress.branchReads || {}).filter(([, count]) => Number.isSafeInteger(count) && count >= 0));
  // Older cursors also scanned the starting artist's entire discography for
  // aliases. Keep their actual progress and destination work, not that detour.
  if (direction === "alias") progress.queue = progress.queue.filter(task => task.type === "artist" || ["destination_catalogue", "destination_edition"].includes(task.purpose));
  const pageLimit = Math.max(1, Math.min(40, Math.floor(Number(limit) || 12)));
  const budget = Number.isFinite(Number(requestBudget)) ? Math.max(0, Math.min(20, Math.floor(Number(requestBudget)))) : 5;
  const hasSelection = typeof candidateEligible === "function";
  const eligibleTarget = hasSelection ? Math.max(1, Math.min(pageLimit, Math.floor(Number(minimumEligible) || 1))) : 1;
  const seen = new Set(progress.seen);
  const done = new Set(progress.done);
  const queued = new Set(progress.queue.map(taskKey));
  const combined = deltaBuilder();
  const sourceStates = { graph: "read", ...(progress.sourceStates || {}), discogs: configured.discogs ? progress.sourceStates?.discogs || "not_queried" : "not_configured", musicbrainz: progress.sourceStates?.musicbrainz || "not_queried" };
  const requiredSources = new Set(progress.requiredSources || []);
  const addDelta = (delta) => { mergeGraph(state, delta); for (const node of delta.entities) combined.entity(node); for (const edge of delta.edges) combined.edge(edge.from, edge.to, edge.kind, edge.source, edge.sourceUrl, edge); };
  const enqueue = (tasks) => { for (const task of tasks) {
    requiredSources.add(task.source);
    if (done.has(taskKey(task))) continue;
    if (!queued.has(taskKey(task))) { progress.queue.push(task); queued.add(taskKey(task)); }
    else {
      const previous = progress.queue.find((entry) => taskKey(entry) === taskKey(task));
      if (previous && catalogueTaskPriority(task) > catalogueTaskPriority(previous)) Object.assign(previous, task);
    }
  } };
  const candidates = () => catalogueCandidates(state, seedId, direction).filter((candidate) => !seen.has(candidate.id));
  let values = candidates();
  const eligible = () => hasSelection ? values.filter(candidateEligible.forGraph?.(state) || (candidate => candidateEligible(candidate, state))) : values;
  let calls = 0, cacheHits = 0, processedTasks = 0;
  const taskBudget = 80;
  const failedSources = new Set();
  enqueue(planTasks(state, seedId, direction));
  const partnerDirection = ["featuring", "remix", "alias"].includes(direction);
  const pendingBranches = () => [...new Set(progress.queue.map(task => task.branch).filter(Boolean))];
  const sampledBranches = () => new Set(eligible().map(item => item.anchor?.id).filter(Boolean));
  const needsVariety = () => (calls + cacheHits > 0 && direction === "label" && new Set(eligible().map(item => item.releaseId || item.id)).size < 3) ||
    (partnerDirection && sampledBranches().size < 3 && pendingBranches().some(branch => !sampledBranches().has(branch)));
  while ((eligible().length < eligibleTarget || needsVariety()) && progress.queue.length && processedTasks < taskBudget && (calls < budget || readCached)) {
    let taskPosition = -1;
    for (let position = 0; position < progress.queue.length; position++) {
      const next = progress.queue[position];
      if (failedSources.has(next.source)) continue;
      const previous = progress.queue[taskPosition];
      // Round-robin between documented partners, then priority within each.
      // The cursor carries service counts so a new click cannot restart at A.
      const difference = partnerDirection && next.branch && previous?.branch
        ? Number(branchReads[next.branch] || 0) - Number(branchReads[previous.branch] || 0) : 0;
      if (taskPosition === -1 || difference < 0 || (difference === 0 && catalogueTaskPriority(next) > catalogueTaskPriority(previous))) taskPosition = position;
    }
    if (taskPosition === -1) break;
    const [task] = progress.queue.splice(taskPosition, 1);
    queued.delete(taskKey(task));
    if (task.source === "discogs" && !configured.discogs) {
      // Missing access is not a completed read. Keep the same page resumable
      // after configuration, without spinning or charging the request budget.
      progress.queue.unshift(task);
      queued.add(taskKey(task));
      failedSources.add(task.source);
      continue;
    }
    processedTasks++;
    try {
      const read = async (source, resource, parameters) => {
        const cached = readCached?.(source, resource, parameters);
        if (cached != null) { cacheHits++; return cached; }
        if (calls >= budget) throw Object.assign(new Error("Catalogue request budget reached"), { code: "CATALOGUE_BUDGET" });
        calls++;
        return request(source, resource, parameters);
      };
      const source = task.source;
      const page = task.page || 1;
      let data;
      if (task.type === "artist") {
        data = await read(
          source,
          source === "discogs"
            ? `/artists/${task.id}`
            : `artist/${task.id}`,
          source === "discogs"
            ? {}
            : { inc: "artist-rels+url-rels" }
        );

        const existing = Object.values(state.entities).find(
          node =>
            node.type === "artist" &&
            String(node.externalIds?.[source]) === String(task.id)
        );

        addDelta(artistGraph(data, source, existing));
      } else if (task.type === "label_profile") {
        data = await read(
          source,
          source === "discogs"
            ? `/labels/${task.id}`
            : `label/${task.id}`,
          source === "discogs"
            ? {}
            : { inc: "url-rels" }
        );

        const existing = Object.values(state.entities).find(
          node =>
            node.type === "label" &&
            String(node.externalIds?.[source]) === String(task.id)
        );

        addDelta(labelProfileGraph(data, source, existing));
      } else if (["artist_releases", "label", "release_group", "recording"].includes(task.type)) {
        const sourceType = task.type === "artist_releases" ? "artist" : task.type === "release_group" ? "release-group" : task.type;
        data = await read(source, source === "discogs" ? `/${sourceType === "artist" ? "artists" : "labels"}/${task.id}/releases` : "release", source === "discogs" ? { per_page: 8, page, sort: "year", sort_order: "desc" } : { [sourceType]: task.id, limit: 8, offset: (page - 1) * 8, inc: "artist-credits+labels+release-groups" });
        const releases = data.releases || [];
        if (task.type === "label") {
          const catalogueSize = Number(source === "discogs" ? data.pagination?.items : data["release-count"]);
          const labelNode = Object.values(state.entities).find(node => node.type === "label" && String(node.externalIds?.[source]) === String(task.id));
          if (labelNode && Number.isFinite(catalogueSize) && catalogueSize > 0) addDelta({ entities: [{ ...labelNode, catalogueSize }], edges: [] });
        }
        const purpose = task.type === "label" || task.purpose === "destination_catalogue" || task.purpose === "destination_edition" ? "destination_edition" : "seed_edition";
        enqueue(diversifyCatalogueReleases(releases).filter((release) => release.id).map((release) => ({ source, type: source === "discogs" && release.type === "master" ? "master" : "release", id: String(release.id), page: 1, purpose, branch: task.branch })));
        const hasNext = source === "discogs" ? page < Number(data.pagination?.pages || 1) : page * 8 < Number(data["release-count"] || 0);
        if (hasNext) enqueue([{ ...task, page: page + 1 }]);
      } else if (task.type === "master") {
        data = await read(source, `/masters/${task.id}`, {});
        if (data.main_release) enqueue([{ source, type: "release", id: String(data.main_release), page: 1, originalDate: data.year || "", purpose: task.purpose, branch: task.branch }]);
      } else if (task.type === "release") {
        data = await read(source, source === "discogs" ? `/releases/${task.id}` : `release/${task.id}`, source === "discogs" ? {} : { inc: "artist-credits+labels+recordings+release-groups+recording-level-rels+artist-rels+isrcs" });
        addDelta(source === "discogs" ? discogsReleaseGraph({ ...data, master_year: task.originalDate || data.master_year || "" }) : musicBrainzReleaseGraph(data));
      }
      sourceStates[source] = "ok";
      done.add(taskKey(task));
      // Finish one playable sample before moving to the next partner. Counting
      // profile/list reads here would spend a small budget without any tracks.
      if (task.branch && task.type === "release") branchReads[task.branch] = Number(branchReads[task.branch] || 0) + 1;
      enqueue(planTasks(state, seedId, direction));
    } catch (error) {
      if (error.code === "CATALOGUE_BUDGET") {
        progress.queue.unshift(task); queued.add(taskKey(task)); processedTasks--; break;
      }
      sourceStates[task.source] = /429|quota|rate/i.test(error.message) ? "rate_limited" : "unavailable";
      // Preserve the failed page for an explicit retry, without retrying it in
      // this same request or claiming an empty catalogue.
      progress.queue.unshift(task);
      queued.add(taskKey(task));
      failedSources.add(task.source);
    }
    values = candidates();
  }
  const eligibleValues = eligible(), eligibleIds = new Set(eligibleValues.map(item => item.id));
  // A useful late discovery must not be pushed out of the returned page by the
  // earlier hidden album. Hidden evidence remains in the delta and cursor.
  const ordered = hasSelection
    ? [...diversifyCatalogueReleases(eligibleValues), ...diversifyCatalogueReleases(values.filter(item => !eligibleIds.has(item.id)))]
    : diversifyCatalogueReleases(values);
  const pageCandidates = ordered.slice(0, pageLimit);
  for (const candidate of pageCandidates) seen.add(candidate.id);
  const hasMore = values.length > pageCandidates.length || progress.queue.length > 0;
  const unavailable = Object.values(sourceStates).some((value) => ["unavailable", "rate_limited"].includes(value));
  const localDirection = ["curator", "scene", "era"].includes(direction);
  const localAnchor = directionAnchors(graphIndex(state), seedId, direction).anchors.size > 0;
  const documentedStart = [...directionAnchors(graphIndex(state), seedId, direction).starts.keys()].some(id => state.entities[id]?.type === "artist" && ["discogs", "musicbrainz"].some(source => validId(source, state.entities[id]?.externalIds?.[source])));
  const untouched = !requiredSources.size && !done.size && !pageCandidates.length && !hasMore && (!localDirection || (!localAnchor && !documentedStart));
  const confirmationCandidates = untouched ? pendingArtistConfirmations(state, seedId) : [];
  const status = confirmationCandidates.length ? "needs_confirmation" : untouched ? "needs_enrichment" : unavailable ? "source_unavailable" : hasMore ? "partial" : pageCandidates.length ? "documented" : "not_documented";
  const complete = !hasMore && !unavailable && (requiredSources.size ? [...requiredSources].every((source) => sourceStates[source] === "ok") : localDirection && (localAnchor || documentedStart));
  const targetReached = eligibleValues.length >= eligibleTarget;
  const missingSource = [...requiredSources].some(source => sourceStates[source] === "not_configured");
  const stopReason = targetReached ? "target_reached" : unavailable ? "source_unavailable" : missingSource ? "source_not_configured" : confirmationCandidates.length ? "needs_confirmation" : untouched ? "needs_identity" : processedTasks >= taskBudget && progress.queue.length ? "processing_budget" : calls >= budget && progress.queue.length ? "request_budget" : "documented_frontier_exhausted";
  const selection = { applied: hasSelection, eligible: eligibleValues.length, returnedEligible: pageCandidates.filter(item => eligibleIds.has(item.id)).length, target: eligibleTarget, targetReached, hidden: values.length - eligibleValues.length, stopReason };
  const nextCursor = hasMore ? Buffer.from(JSON.stringify({ policy: 2, revision, seedId, direction, seen: [...seen], done: [...done], queue: progress.queue, branchReads, sourceStates, requiredSources: [...requiredSources] })).toString("base64url") : null;
  const message = status === "needs_confirmation" ? "Confirmez l’artiste de ce morceau pour explorer ses crédits et son catalogue. Ouvrez sa fiche source si vous hésitez."
    : status === "needs_enrichment" ? localDirection ? "Aucune relation de cette direction n’est documentée pour ce départ. Cela ne signifie pas que cette piste est épuisée." : "Ce départ n’a pas encore d’identifiant de catalogue exploitable. Identifiez le morceau ou choisissez un artiste déjà relié à Discogs ou MusicBrainz."
      : unavailable ? "Une source est indisponible. La page reste à reprendre."
        : hasMore ? "Catalogue partiel ; d’autres pages peuvent être explorées."
          : "Fin des relations documentées dans les sources consultées ; ce n’est pas une preuve d’exhaustivité mondiale.";
  return { status, seedId, direction, candidates: pageCandidates, confirmationCandidates, graphDelta: combined.result(), coverage: { state: status, complete, scope: requiredSources.size ? "documented_catalogues" : "local_graph", requiredSources: [...requiredSources], sourceStates, hasMore, nextCursor, pendingPages: progress.queue.length, fetchedRequests: calls, cacheHits, processedTasks, completedTasks: done.size, requestBudget: budget, selection, message } };
}

export function bandcampEvidenceGraph(payload = {}) {
  const url = new URL(payload.sourceUrl || payload.url || "");
  if (url.protocol !== "https:" || !/(^|\.)bandcamp\.com$/i.test(url.hostname) || !/\/(album|track)\/[^/]+/.test(url.pathname)) throw new Error("Une URL Bandcamp d’album ou de morceau est nécessaire.");
  if (!clean(payload.artist) || !clean(payload.title)) throw new Error("Artiste et titre requis.");
  const builder = deltaBuilder();
  const key = createHash("sha256").update(url.origin + url.pathname).digest("hex").slice(0, 32);
  // Label-hosted albums can have unrelated artists on the same subdomain.
  // Scope the asserted artist to this supplied release; never merge by host.
  const artistId = nodeId("artist", "bandcamp", key);
  const releaseId = nodeId("release", "bandcamp", key);
  const dates = releaseDates({ date: payload.releaseDate, originalDate: payload.originalDate });
  builder.entity({ id: artistId, type: "artist", name: clean(payload.artist).slice(0, 120), url: url.origin, source: "user_supplied", status: "user_supplied" });
  builder.entity({ id: releaseId, type: "release", title: clean(payload.title).slice(0, 300), artists: [{ id: artistId, name: clean(payload.artist) }], date: dates.releaseDate, dates, url: url.href, source: "user_supplied", status: "user_supplied" });
  builder.edge(artistId, releaseId, "credited_on_release", "user_supplied", url.href, { status: "user_supplied" });
  if (payload.artistEntityId) builder.edge(String(payload.artistEntityId), artistId, "same_identity", "user_supplied", url.href, { status: "confirmed_user" });
  if (payload.label) {
    const labelId = builder.entity({ id: nodeId("label", "bandcamp", key), type: "label", name: clean(typeof payload.label === "string" ? payload.label : payload.label.name).slice(0, 160), url: url.origin, source: "user_supplied", status: "user_supplied" });
    builder.edge(releaseId, labelId, "issued_by", "user_supplied", url.href, { status: "user_supplied" });
  }
  if (payload.tracks && !Array.isArray(payload.tracks)) throw new Error("La liste des morceaux doit être un tableau.");
  if ((payload.tracks || []).length > 500) throw new Error("500 morceaux maximum par import Bandcamp.");
  for (const [index, track] of (payload.tracks || []).entries()) {
    if (!clean(track.title)) continue;
    const trackArtist = track.artist && track.artist !== payload.artist ? builder.entity({ id: nodeId("artist", "bandcamp", `${key}:${index}`), type: "artist", name: clean(track.artist).slice(0, 120), source: "user_supplied" }) : artistId;
    const id = builder.entity({ id: nodeId("track", "bandcamp", `${key}:${index}`), type: "track", title: clean(track.title).slice(0, 300), artists: [{ id: trackArtist, name: clean(track.artist || payload.artist) }], date: dates.releaseDate, dates, url: url.href, source: "user_supplied" });
    builder.edge(id, releaseId, "appears_on", "user_supplied", url.href, { status: "user_supplied" });
    builder.edge(trackArtist, id, "credited_on", "user_supplied", url.href, { status: "user_supplied" });
  }
  return builder.result();
}
