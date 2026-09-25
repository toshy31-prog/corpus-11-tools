import { SCOUT_DIRECTIONS, createScoutPatch } from "./scout-parameters.mjs";
import { splitArtistNames } from "./artist-names.mjs";
import { presentationGroups } from "./discovery-presentation.mjs";
import { mixDirectionGroups } from "./direction-mixer.mjs";
import { compareMusic, artistRelation, artistRelationAllowed } from "./music-sorting.mjs";
import { videoContent } from "./video-content.mjs";

const INACTIVE = new Set(["paused", "explored", "dismissed"]);
const list = value => Array.isArray(value) ? value : [];
const integer = (value, fallback = 0) => Number.isFinite(Number(value))
  ? Math.max(0, Math.floor(Number(value))) : fallback;
const validItem = item => item && typeof item.id === "string" && item.id.trim() && item.id === item.id.trim();

export function reconcileDirectionFilter(filter, routes = []) {
  return routes.some(route => route.id === filter && route.enabled) ? filter : "";
}

export function emptyMixMessage(view = {}) {
  const selected = (view.routes || []).filter(route => route.enabled && (!view.directionFilter || route.id === view.directionFilter));
  if (view.busy) return "Recherche en cours. Les résultats arriveront ici ; vous pouvez interrompre l’attente.";
  if (!selected.length && (view.routes || []).some(route => route.weight > 0 && route.state === "confirmation")) return "Les directions choisies attendent une fiche artiste. Utilisez les propositions ou indiquez une fiche MusicBrainz / Discogs ; relancer les mêmes directions ne confirme pas l’identité.";
  if (!selected.length) return "Activez une direction dans les réglages pour commencer.";
  if (selected.some(route => route.contentHidden) && !selected.some(route => route.eligible)) return "Les publications chargées sont masquées par les filtres de contenu ou d’artistes. Incluez les entretiens / annonces pour les revoir, ou cherchez d’autres pistes.";
  if (selected.some(route => route.state === "error" || route.state === "unavailable")) return "La recherche n’a pas abouti : une source est indisponible. Réessayez les sources ; aucun résultat ne signifie pas ici aucun lien.";
  if (selected.some(route => route.state === "confirmation")) return "L’identité du départ doit être précisée avant de consulter ces catalogues.";
  if (selected.some(route => route.distantHidden)) return "Des liens éditoriaux larges sont disponibles. Activez « Inclure les liens éloignés » pour les consulter, ou recherchez d’autres directions.";
  if (selected.some(route => route.artistHidden)) return "Des pistes chargées sont masquées par le filtre d’artistes. Incluez les artistes inconnus à vérifier ou les collaborations avec d’autres participants, ou désactivez « Autres artistes uniquement ». Aucune nouvelle recherche n’est nécessaire pour les revoir.";
  if (selected.some(route => route.loaded)) return "Vous avez parcouru les pistes admissibles chargées. Recommencez les pages de ce départ ou recherchez d’autres pistes.";
  if (selected.some(route => route.state === "partial")) return "La recherche est incomplète. Reprenez les sources ; les détails des directions précisent ce qui manque.";
  if (selected.some(route => route.canLoad)) return "Lancez la recherche pour consulter les directions activées.";
  return "Aucun lien trouvé dans les sources consultées. Vous pouvez changer de départ ; cela ne prouve pas l’absence de liens ailleurs.";
}

// This is presentation history, NOT listening history or an identity claim.
export function mixHistoryForSeed(history, seedId) {
  return {
    seedId: String(seedId || ""),
    turn: history?.seedId === seedId ? integer(history.turn) : 0,
    seenIds: history?.seedId === seedId
      ? [...new Set(list(history.seenIds).filter(id => typeof id === "string"))] : []
  };
}

export function consumeMixPage(history, view) {
  const previous = mixHistoryForSeed(history, view?.seedId);
  if (!view?.seedId || !list(view.items).length) return previous;
  return {
    ...previous,
    turn: previous.turn + 1,
    seenIds: [...new Set([...previous.seenIds, ...view.items.flatMap(item => item.presentation?.ids || [item.id])])]
  };
}

/**
 * Adapter around existing direction groups and the existing selector.
 * The selector is injected, so there is no second discovery algorithm here.
 * No graph, collection, source request or identity resolver is accessible.
 *
 * Ordering: selectDiscoveries per route -> existing mixer -> weighted interleave.
 * Do NOT pass the mixed queue back through an unweighted global selector.
 */
export function buildScoutMixView({
  seedId = "", groups = {}, front = null, guidance = {}, patch = {}, history = {}, routePlans = {},
  focus = "breadth", seedArtist = "", seedArtistIds = [], limit = 6, directionFilter = "", select
} = {}) {
  if (typeof select !== "function") throw new TypeError("Le sélecteur Scout est requis.");
  const controls = createScoutPatch(patch);
  const explicitSpread = Boolean(patch && typeof patch === "object" && ((patch.shape && Object.hasOwn(patch.shape, "spread")) || Object.hasOwn(patch, "spread")));
  const effectiveSpread = explicitSpread ? controls.shape.spread : focus === "depth" ? 0 : 1;
  const effectiveControls = { ...controls, shape: { ...controls.shape, spread: effectiveSpread } };
  const currentHistory = mixHistoryForSeed(history, seedId);
  const canFilterArtists = Boolean(seedArtistIds.length || String(seedArtist).trim());
  const artistFilterApplied = controls.otherArtistsOnly && canFilterArtists;
  const compare = (a, b) => compareMusic(a, b, controls.sort, { shuffleKey: controls.shuffleKey });
  const excluded = new Set(currentHistory.seenIds);
  for (const group of Object.values(groups || {})) {
    for (const id of list(group?.seenIds)) excluded.add(id);
  }
  if (seedId) excluded.add(seedId);
  const allPresentation = presentationGroups(Object.values(groups).flatMap(group => list(group?.items)));
  for (const group of allPresentation.groups) if (group.variants.some(item => excluded.has(item.id))) {
    for (const item of group.variants) excluded.add(item.id);
  }

  const prepared = {};
  const hiddenCards = new Set(), visibleCards = new Set(), hiddenUnknownCards = new Set();
  const reference = { name: seedArtist, artistIds: seedArtistIds };
  const originals = new Map();
  const directLinkedIds = new Set(Object.entries(groups).filter(([id]) => ["remix", "featuring", "alias", "compilation"].includes(id) && controls.directionWeights[id] > 0).flatMap(([, group]) => list(group.items).filter(item => !item.relationship?.distant).map(item => item.id)));
  // Name searches are a local presentation pool, never a catalogue relation
  // or a ninth remote discovery engine.
  const supplementaryDirections = groups.participants ? [{ id: 'participants', label: 'Recherches par nom' }] : [];
  const routes = [...SCOUT_DIRECTIONS, ...supplementaryDirections].map(({ id, label }) => {
    const group = groups?.[id];
    const branch = list(front?.branches).find(value => value.direction === id);
    const plan = routePlans?.[id] || null;
    const blocked = plan && ["not_applicable", "source_gap"].includes(plan.implementation);
    const weight = id === 'participants' ? 1 : effectiveControls.directionWeights[id];
    const paused = INACTIVE.has(branch?.status) || INACTIVE.has(group?.status);
    const identityWaiting = guidance?.catalogueIdentityRequired && id !== 'curator' && id !== 'participants' &&
      !list(group?.items).length && (!group?.coverage?.state || group.coverage.state === 'not_checked');
    const confirmation = identityWaiting || group?.coverage?.state === "needs_confirmation" ||
      (guidance?.state === "needs_confirmation" && list(guidance.directions).includes(id));
    const raw = list(group?.items).filter(validItem);
    const nearby = raw.filter(item => controls.includeDistant || !item.relationship?.distant || directLinkedIds.has(item.id) || item.anchor?.id === seedId);
    const contentVisible = nearby.filter(item => {
      const { kind } = videoContent(item);
      return (kind !== "editorial" || controls.includeEditorial) && (kind !== "promotional" || controls.includePromotional);
    });
    const classifications = new Map(contentVisible.map(item => [item, artistRelation(item, reference)]));
    const eligibleRaw = artistFilterApplied ? contentVisible.filter(item => {
      const relation = classifications.get(item);
      return artistRelationAllowed(relation, controls);
    }) : contentVisible;
    const enabled = Boolean(seedId && weight > 0 && !paused && !confirmation && !blocked);
    if (enabled && (!directionFilter || directionFilter === id)) {
      const eligibleSet = new Set(eligibleRaw);
      for (const item of raw) {
        if (excluded.has(item.id)) continue;
        const cardId = allPresentation.byId.get(item.id)?.id || item.id;
        (eligibleSet.has(item) ? visibleCards : hiddenCards).add(cardId);
        if (!eligibleSet.has(item) && classifications.get(item) === "unknown") hiddenUnknownCards.add(cardId);
      }
    }
    const unavailable = group?.coverage?.state === "source_unavailable";
    const operationalState = !seedId ? "idle" : !weight ? "muted" : paused ? "paused" :
      confirmation ? "confirmation" : group?.loading ? "loading" : group?.error ? "error" :
      unavailable ? "unavailable" : raw.length ? "ready" :
      group?.coverage?.complete && !group?.coverage?.hasMore ? "empty" :
      group?.coverage?.state && group.coverage.state !== "not_checked" ? "partial" : "pending";
    const state = blocked
      ? plan.implementation === "not_applicable" ? "n/a" : "unsupported"
      : operationalState === "pending" && plan?.implementation === "orchestration_gap" ? "mediated"
        : operationalState === "pending" && plan?.implementation === "implemented_local" && plan?.mode === "aggregate" ? "aggregate"
          : operationalState;
    let selected = [];
    if (enabled && raw.length) {
      // Isolate even a selector that updates its candidate objects.
      const choices = select(structuredClone(eligibleRaw), {
        exclude: [...excluded], limit: raw.length,
        focus: effectiveSpread === 0 ? "depth" : "breadth",
        spread: effectiveSpread,
        turn: currentHistory.turn + integer(group?.turn), seedArtist
      });
      if (!Array.isArray(choices)) throw new TypeError("Le sélecteur Scout doit retourner une liste.");
      const byId = new Map(raw.map(item => [item.id, item]));
      const seen = new Set();
      selected = choices.filter(item => validItem(item) && byId.has(item.id) &&
        !excluded.has(item.id) && !seen.has(item.id) && seen.add(item.id));
      selected.sort(compare);

      originals.set(id, byId);
      if (!directionFilter || directionFilter === id) {
        const selectedBundles = new Set(selected.map(item => allPresentation.byId.get(item.id)?.id));
        prepared[id] = { items: selected, variants: eligibleRaw.filter(item => !excluded.has(item.id) && selectedBundles.has(allPresentation.byId.get(item.id)?.id)) };
      }
    }
    const canLoad = id !== 'participants' && enabled && !group?.loading && (!group || Boolean(group.error) || unavailable ||
      Boolean(group.coverage?.hasMore) || (!raw.length && !group.coverage?.complete));
    const loadKind = !canLoad ? null : group?.error || unavailable ? "retry" :
      group?.coverage?.hasMore ? "continue" : "open";
    return {
      id, label, weight, state, enabled, plan,
      loaded: raw.length, eligible: selected.length, presented: 0, distantHidden: raw.length - nearby.length, contentHidden: nearby.length - contentVisible.length, artistHidden: contentVisible.length - eligibleRaw.length,
      artistUnknownHidden: artistFilterApplied && !controls.includeUnknownArtists ? contentVisible.filter(item => classifications.get(item) === "unknown").length : 0,
      artistCollaborationHidden: artistFilterApplied && !controls.includeCollaborations ? contentVisible.filter(item => classifications.get(item) === "collaboration").length : 0,
      distinctCurators: id === "curator"
        ? new Set(raw.map(item => String(item.channelId || item.anchor?.id || item.channelTitle || "")).filter(Boolean)).size
        : 0,
      distinctArtists: new Set(raw.map(item => String(item.artist || "").trim()).filter(Boolean)).size,
      frontierState: front?.frontier?.byDirection?.[id]?.state || "",
      frontierTargets: Number(front?.frontier?.byDirection?.[id]?.targets || 0),
      frontierBranches: Number(front?.frontier?.byDirection?.[id]?.firstBranches || 0),
      frontierMaxDepth: Number(front?.frontier?.byDirection?.[id]?.maxObservedDepth || 0),
      canLoad, loadKind,
      message: identityWaiting ? "En attente d’une fiche artiste. Choisissez une proposition, modifiez le nom de recherche ou indiquez une URL MusicBrainz / Discogs. Aucune recherche catalogue lancée pour cette direction." : String(group?.error || group?.coverage?.message || ""),
      selection: group?.coverage?.selection || null,
      stopReason: group?.coverage?.selection?.stopReason || "",
      hasMore: Boolean(group?.coverage?.hasMore),
      complete: Boolean(group?.coverage?.complete),
      loading: Boolean(group?.loading)
    };
  });

  // Group source variants for display only, retaining originals and actions.
  const presentation = presentationGroups(Object.values(prepared).flatMap(group => group.variants));
  for (const [direction, group] of Object.entries(prepared)) {
    const seen = new Set(), sourceItems = new Map();
    group.items = group.items.flatMap(item => {
      const bundle = presentation.byId.get(item.id);
      if (seen.has(bundle.id)) return [];
      seen.add(bundle.id); sourceItems.set(bundle.id, originals.get(direction)?.get(item.id) || item);
      return [{ ...item, id: bundle.id, presentation: { ids: bundle.variants.map(value => value.id), variants: bundle.variants, basis: bundle.basis } }];
    });
    originals.set(direction, sourceItems);
  }
  // These IDs represent cards, not newly asserted graph identities.
  const mixed = mixDirectionGroups(prepared, { patch: effectiveControls, exclude: [...excluded], supplementaryDirections });
  const byId = new Map(mixed.map(item => [item.id, item]));
  // Era qualifies a documented route. It must not give that same card an
  // additional queue slot; a focused Era view still exposes all its items.
  const directIds = new Set(Object.entries(prepared).filter(([id]) => id !== "era").flatMap(([, group]) => group.items.map(item => item.id)));
  let queues = routes.filter(route => prepared[route.id]?.items.length).map(route => ({
    ...route, index: 0, served: 0, items: prepared[route.id].items.filter(item => directionFilter || route.id !== "era" || !directIds.has(item.id))
  })).filter(queue => queue.items.length);
  const picked = new Set();
  const items = [];
  const max = Math.min(60, integer(limit, 6));
  // Diversity is a preference within this page, never a deletion from the
  // remaining pool. A focused route can be browsed in full. In a mixed page,
  // prefer other sources, then fill spare places with the remaining uploads.
  const curatorCap = !directionFilter && queues.length > 1
    ? 1 + Math.floor((1 - effectiveSpread) * Math.max(0, max - 1)) : Infinity;
  const curatorCounts = new Map();
  const albumCounts = new Map(), artistCounts = new Map();
  const familyCounts = new Set();
  const strictDiversity = effectiveSpread > 0 && controls.sort === "explore" && !directionFilter;
  // Individual credits, not the whole 'X & Y' display string. These keys
  // diversify presentation only; they never merge catalogue identities.
  const artistKeys = item => [...new Set([...(item.artistIds || []).map(id => `id:${id}`),
    ...splitArtistNames(item.artist).map(name => name.toLocaleLowerCase("fr")).map(name => `name:${name}`)])];
  const intermediaryCounts = new Map();
  const intermediaryKey = item => item.anchor?.id || "";
  const curatorKey = item => String(item.channelId || item.anchor?.externalIds?.youtube || item.anchor?.id || item.channelTitle || "unknown-curator");
  // When a page is smaller than the number of enabled routes, rotate ties
  // on the NEXT gesture so the last routes cannot starve forever.
  const rotation = queues.length ? (currentHistory.turn * Math.max(1, max)) % queues.length : 0;
  queues = [...queues.slice(rotation), ...queues.slice(0, rotation)];

  // Virtual finish times implement a deterministic relative route mix.
  // Equal weights alternate routes; a larger weight receives more slots.
  while (items.length < max) {
    let winner = null;
    for (const respectDiversity of (strictDiversity ? [true] : [true, false])) {
      for (const queue of queues) {
        const item = queue.items.find(candidate => !picked.has(candidate.id) &&
          (!respectDiversity || ((queue.id !== "curator" || (curatorCounts.get(curatorKey(candidate)) || 0) < curatorCap) &&
            (!effectiveSpread || !candidate.releaseId || !albumCounts.has(candidate.releaseId)) &&
            (!effectiveSpread || artistKeys(candidate).every(key => (artistCounts.get(key) || 0) < 2)) &&
            (!effectiveSpread || !intermediaryKey(candidate) || (intermediaryCounts.get(intermediaryKey(candidate)) || 0) < 2) &&
            (!effectiveSpread || !videoContent(candidate).family || !familyCounts.has(videoContent(candidate).family)))));
        if (!item) continue;
        const finish = (queue.served + 1) / queue.weight;
        if (!winner || (controls.sort === "explore" ? finish < winner.finish : compare(item, winner.item) < 0)) winner = { queue, finish, item };
      }
      if (winner) break;
    }
    if (!winner) break;
    const queue = winner.queue;
    const item = winner.item;
    if (queue.id === "curator") curatorCounts.set(curatorKey(item), (curatorCounts.get(curatorKey(item)) || 0) + 1);
    if (item.releaseId) albumCounts.set(item.releaseId, (albumCounts.get(item.releaseId) || 0) + 1);
    if (videoContent(item).family) familyCounts.add(videoContent(item).family);
    for (const key of artistKeys(item)) artistCounts.set(key, (artistCounts.get(key) || 0) + 1);
    if (intermediaryKey(item)) intermediaryCounts.set(intermediaryKey(item), (intermediaryCounts.get(intermediaryKey(item)) || 0) + 1);
    queue.served++;
    picked.add(item.id);
    const merged = byId.get(item.id);
    const observations = list(merged?.routing?.routes).map(route => ({
      direction: route.direction, weight: route.weight,
      item: originals.get(route.direction)?.get(item.id)
    })).filter(observation => observation.item);
    items.push({
      ...item,
      artistRelation: canFilterArtists ? artistRelation(item, reference) : "unknown",
      routing: {
        ...merged.routing,
        selectedVia: queue.id,
        // Preserve EACH observation, not only the first route's proof.
        observations
      }
    });
    routes.find(route => route.id === queue.id).presented++;
  }
  return {
    seedId,
    canFilterArtists,
    artistFilterApplied,
    patch: effectiveControls,
    items,
    routes,
    candidates: mixed.length,
    hiddenCandidates: [...hiddenCards].filter(id => !visibleCards.has(id)).length,
    hiddenUnknownCandidates: [...hiddenUnknownCards].filter(id => !visibleCards.has(id)).length,
    diversityLimited: strictDiversity && items.length < max && mixed.length > items.length,
    hasNextPage: items.length > 0 && mixed.length > items.length,
    directionFilter,
    canRewind: excluded.size > (seedId ? 1 : 0),
    history: currentHistory,
    discovery: {
      depthLimit: Number(front?.frontier?.depthLimit || effectiveControls.shape?.depth || 0),
      maxObservedDepth: Number(front?.frontier?.maxObservedDepth || 0),
      distinctTargets: Number(front?.frontier?.distinctTargets || 0),
      distinctFirstBranches: Number(front?.frontier?.distinctFirstBranches || 0),
      distinctPaths: Number(front?.frontier?.distinctPaths || 0)
    }
  };
}

/** Sequential, explicit loading. A changed departure or cancelled run wins. */
export async function runScoutMixLoad({ directions, isCurrent, isEnabled, load, onProgress = () => {} }) {
  let completed = 0;
  for (const direction of directions) {
    if (!isCurrent()) return { completed, cancelled: true };
    if (!isEnabled(direction)) continue;
    await load(direction);
    if (!isCurrent()) return { completed, cancelled: true };
    completed++;
    onProgress(completed);
  }
  return { completed, cancelled: false };
}
