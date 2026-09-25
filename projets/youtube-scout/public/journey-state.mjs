import { declaredDepartureArtist, typedDepartureModel, localDepartureMembers } from "./departure-workflow.mjs";
import { departureRoutingGraph } from "./departure-integrity.mjs";
// Presentation-only guidance. This module never creates or upgrades a relation:
// a probable artist remains a hypothesis until an explicit trusted edge exists.
const TRUSTED_IDENTITY = new Set(["confirmed_cross_id", "confirmed_user", "corroborated"]);
const IDENTITY_DIRECTIONS = new Set(["alias", "label", "remix", "featuring", "compilation", "scene"]);
const PERSONAL_STATES = new Set(["paused", "explored", "dismissed"]);

function values(value) {
  return Array.isArray(value) ? value : Object.values(value || {});
}

function artistKey(value) {
  return (String(value || "").toLocaleLowerCase("fr-FR").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").match(/[\p{L}\p{N}]+/gu) || []).join("");
}

function realId(source, id) {
  return source === "discogs" ? /^[1-9]\d*$/.test(String(id || ""))
    : source === "musicbrainz" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id || ""));
}

function catalogueArtist(value = {}) {
  const id = String(value.id || "");
  if (!id || (value.type && value.type !== "artist")) return null;
  const encoded = id.match(/^artist:(discogs|musicbrainz):(.+)$/);
  const source = ["discogs", "musicbrainz"].find((provider) => realId(provider,
    value.externalIds?.[provider] || (value.source === provider ? value.sourceId : "") || (encoded?.[1] === provider ? encoded[2] : "")));
  if (!source) return null;
  const sourceId = String(value.externalIds?.[source] || (value.source === source ? value.sourceId : "") || encoded[2]);
  return {
    id,
    name: String(value.name || value.label || value.title || id).trim(),
    source,
    sourceId,
    sourceUrl: source === "discogs" ? `https://www.discogs.com/artist/${sourceId}` : `https://musicbrainz.org/artist/${sourceId}`
  };
}

function hasResults(group) {
  return Boolean(group?.items?.length || group?.selectedIds?.length);
}

function groupState(group) {
  return String(group?.coverage?.state || group?.status || "not_checked");
}

/** Summarise only the current departure, without conflating missing identity
 * with an empty catalogue. `directions` scopes the priority action; another
 * direction (notably the curator) can remain usable at the same time. */
export function journeyGuidance({ seed = null, groups = {}, graph = {}, dossier = null, front = null, disputedArtistIds = [] } = {}) {
  graph = departureRoutingGraph(graph);
  disputedArtistIds = new Set(disputedArtistIds || []);
  const empty = { state: "idle", title: "Choisissez un point de départ", message: "Un morceau, un artiste ou un label pour commencer la fouille.", candidates: [], directions: [], identityConfirmed: false };
  if (!seed?.id) return empty;
  const departure = typedDepartureModel({ seed, graph });
  const entries = Object.entries(groups || {});
  const entities = new Map(values(graph.entities).map((entity) => [entity.id, entity]));
  const directArtists = values(graph.edges).filter((edge) =>
    edge.from === seed.id &&
    edge.kind === "probable_artist" &&
    edge.integrityReason !== "departure_revised" &&
    edge.status !== "rejected_user" &&
    !disputedArtistIds.has(edge.to)
  );
  const exactRecordings = new Set(values(graph.edges).filter(edge => edge.from === seed.id && edge.kind === "embodies" && ["resolved", "confirmed_user"].includes(edge.status)).map(edge => edge.to));
  const identityConfirmed = directArtists.some((edge) => TRUSTED_IDENTITY.has(edge.status) && catalogueArtist(entities.get(edge.to)))
    || values(graph.edges).some(edge => exactRecordings.has(edge.to) && edge.kind === "credited_on" && ["resolved", "observed", "confirmed_user"].includes(edge.status) && catalogueArtist(entities.get(edge.from)))
    || (seed.type === "artist" && departure.catalogueKnown);
  const disputedNames = new Set(
    [...disputedArtistIds]
      .map((id) => entities.get(id))
      .filter(Boolean)
      .map((artist) => String(artist.name || artist.label || "").trim().toLocaleLowerCase("fr-FR"))
      .filter(Boolean)
  );
  const candidates = new Map();
  const add = (value, directions) => {
    const artist = catalogueArtist(value);
    if (!artist || !directions.length) return;
    const nameKey = String(artist.name || "").trim().toLocaleLowerCase("fr-FR");
    if (disputedArtistIds.has(artist.id) || (nameKey && disputedNames.has(nameKey))) return;
    const previous = candidates.get(artist.id);
    candidates.set(artist.id, { ...artist, directions: [...new Set([...(previous?.directions || []), ...directions])] });
  };
  if (!identityConfirmed && !departure.container) {
    for (const [direction, group] of entries) {
      if (!IDENTITY_DIRECTIONS.has(direction)) continue;
      for (const candidate of group.confirmationCandidates || group.coverage?.confirmationCandidates || []) add(candidate, [direction]);
    }
    // An old session may contain no catalogue response yet. Direct, real
    // catalogue IDs can supply a confirmation choice, never a trusted join.
    if (!candidates.size && dossier?.suppressWeakIdentityCandidates !== true) {
      const directions = entries.length
        ? entries.filter(([direction, group]) => IDENTITY_DIRECTIONS.has(direction) && !hasResults(group) && !group.coverage?.complete).map(([direction]) => direction)
        : [...IDENTITY_DIRECTIONS];
      for (const edge of directArtists) {
        if (!TRUSTED_IDENTITY.has(edge.status)) add(entities.get(edge.to), directions);
      }
    }
  }
  const result = { ...empty, candidates: [...candidates.values()], identityConfirmed, departureType: departure.type };
  const declaredArtist = declaredDepartureArtist(graph, seed.id);
  if (!identityConfirmed && !departure.container && declaredArtist && dossier?.state !== "loading") return {
    ...result, state: "needs_enrichment", title: `Artiste renseigné : ${declaredArtist}`,
    message: "Le nom est enregistré pour ce morceau. Pour obtenir des découvertes, utilisez une fiche ci-dessous : ses liens catalogue resteront distincts de votre saisie.",
    directions: entries.map(([direction]) => direction)
  };
  if (!identityConfirmed && !departure.container && seed.type !== "artist" && dossier?.suppressWeakIdentityCandidates && dossier.state !== "loading") return {
    ...result, state: "needs_enrichment", title: "Confirmez l’artiste de ce morceau",
    message: dossier.sourceStates?.recording === "interrupted"
      ? "Vérification interrompue. Vous pouvez choisir une fiche artiste ci-dessous ou changer de départ."
      : dossier.sourceStates?.recording === "unavailable"
      ? "La recherche automatique n’a pas pu joindre les catalogues. Choisissez une fiche connue ci-dessous ou cherchez à nouveau par nom."
      : "La recherche automatique n’a pas identifié ce morceau avec certitude. Choisissez l’artiste ci-dessous pour explorer ses connexions, sans prétendre avoir identifié l’enregistrement exact.",
    directions: entries.map(([direction]) => direction)
  };
  if (dossier?.state === "loading") return { ...result, state: "loading", title: "Identification du départ en cours", message: "Le résolveur consulte les sources. Aucune action supplémentaire n’est nécessaire pendant cette recherche.", directions: entries.map(([direction]) => direction) };
  if (result.candidates.length) return {
    ...result, state: "needs_confirmation", title: "Confirmez l’artiste pour continuer",
    message: "Vérifiez la fiche source puis confirmez l’artiste de ce départ. Les directions déjà praticables restent disponibles.",
    directions: [...new Set(result.candidates.flatMap((candidate) => candidate.directions))]
  };
  const loading = entries.filter(([, group]) => group.loading).map(([direction]) => direction);
  if (loading.length) return { ...result, state: "loading", title: "Lecture des catalogues en cours", message: "Les pistes déjà chargées restent disponibles pendant la recherche.", directions: loading };
  const ready = entries.filter(([, group]) => hasResults(group)).map(([direction]) => direction);
  if (ready.length || front?.branches?.some(branch => branch.current)) return { ...result, state: "ready", title: "Des pistes sont prêtes", message: "Écoutez une découverte ou poursuivez dans sa direction.", directions: ready };
  const unavailable = entries.filter(([, group]) => group.error || ["source_unavailable", "unavailable", "rate_limited"].includes(groupState(group))).map(([direction]) => direction);
  if (unavailable.length) return { ...result, state: "source_unavailable", title: "Une source est indisponible", message: "L’absence de résultat n’est pas concluante. Vous pouvez reprendre cette recherche.", directions: unavailable };
  if (entries.length && entries.every(([, group]) => group.coverage?.complete && !group.coverage?.hasMore && groupState(group) !== "needs_confirmation")) return {
    ...result, state: "ready", title: "Directions consultées", message: "Les relations disponibles dans les sources consultées ont été parcourues. Changez de départ pour poursuivre la fouille.", directions: entries.map(([direction]) => direction)
  };
  if (departure.container) {
    const count = localDepartureMembers({ seed, graph }).length;
    const kind = ({ playlist: "playlist", label: "label", channel: "chaîne" })[seed.type];
    return { ...result, state: "needs_enrichment", title: ({ playlist: "Partez des morceaux de cette playlist", label: "Explorez les sorties de ce label", channel: "Explorez les publications de cette chaîne" })[seed.type],
      message: count ? `${count} morceau(s) relié(s) à cette ${seed.type === "label" ? "fiche de label" : kind} dans les données locales. Choisissez un morceau ou recherchez ses connexions.`
        : seed.type === "playlist" ? "Cette playlist n’a pas encore de morceaux importés ici. Importez son contenu dans Bibliothèque & sources pour choisir un départ."
        : "Reprenez la lecture des sources de ce départ. Aucun artiste unique n’est requis pour explorer cette collection.",
      directions: entries.filter(([, group]) => !group.coverage?.complete).map(([direction]) => direction) };
  }
  if (seed.type === "artist" && !identityConfirmed) return { ...result, state: "needs_enrichment", title: "Choisissez la fiche de cet artiste",
    message: `Le nom « ${seed.label || seed.name || "cet artiste"} » est connu. Choisissez sa fiche catalogue pour explorer ses crédits ; les homonymes ne seront pas fusionnés.`, directions: entries.map(([direction]) => direction) };
  return {
    ...result, state: "needs_enrichment", title: identityConfirmed ? "Identité confirmée, catalogue à reprendre" : "Ce départ reste à documenter",
    message: identityConfirmed ? "L’artiste est confirmé. Relancez les directions concernées pour lire son catalogue." : "Identifiez ce départ dans Discogs ou MusicBrainz pour explorer ses crédits. Aucun résultat n’est encore établi.",
    directions: entries.filter(([, group]) => !group.coverage?.complete).map(([direction]) => direction)
  };
}

/** Read model only: keep deliberate personal branch states, but display the
 * actual catalogue prerequisite instead of a stale unexplored/exhausted label. */
export function branchGuidance(branch = {}, group = {}, journey = {}) {
  const state = branch.status || "unexplored";
  if (PERSONAL_STATES.has(state)) return {
    state,
    title: branch.current?.target?.label || ({ paused: "Piste laissée de côté", explored: "Piste explorée", dismissed: "Piste fermée" })[state],
    message: "Votre choix est conservé ; aucune relance automatique n’est effectuée."
  };
  const direction = branch.direction || group.direction;
  const requiresConfirmation = journey.state === "needs_confirmation" && journey.directions?.includes(direction);
  if (requiresConfirmation) return { state: "needs_confirmation", title: "Confirmer l’artiste de départ", message: "Vérifiez puis confirmez l’artiste ci-dessus pour ouvrir cette direction. Aucun catalogue n’a encore été déclaré vide." };
  if (group.loading) return { state: "loading", title: "Lecture de cette direction", message: "Les catalogues sont en cours de lecture." };
  if (hasResults(group) && !branch.current) return { state: "ready", title: "Des découvertes sont disponibles", message: "Les pistes de cette direction sont présentées ci-dessous, dans le catalogue." };
  if (branch.current) return { state: "active", title: branch.current.target?.label || "Piste disponible", message: "Un passage documenté est prêt à être suivi." };
  if (group.error || ["source_unavailable", "unavailable", "rate_limited"].includes(groupState(group))) return { state: "source_unavailable", title: "Source indisponible", message: "La lecture reste à reprendre ; l’absence de résultat n’est pas une piste épuisée." };
  if (groupState(group) === "needs_confirmation") return {
    state: journey.identityConfirmed ? "needs_enrichment" : "needs_confirmation",
    title: journey.identityConfirmed ? "Identité confirmée, direction à reprendre" : "Identité à préciser",
    message: journey.identityConfirmed ? "Relancez cette direction pour lire le catalogue de l’artiste confirmé." : "Le catalogue attend une identification explicite du départ, pas une nouvelle recherche au hasard."
  };
  if (state === "exhausted" && group.coverage?.complete && !group.coverage?.hasMore) return { state, title: "Relations documentées parcourues", message: "Les relations disponibles dans les sources consultées ont été parcourues ; cela ne prouve pas une exhaustivité mondiale." };
  if (state === "source_unavailable") return { state, title: "Source indisponible", message: "Une source manque ou ne répond pas. La recherche peut être reprise." };
  if (state === "unexplored" && groupState(group) === "not_checked") return { state, title: "Direction non explorée", message: "Cette direction n’a pas encore été consultée ; aucune conclusion n’est tirée." };
  return { state: "needs_enrichment", title: "Direction à documenter", message: "Les données de cette direction restent partielles. Reprenez la lecture des catalogues avant de conclure." };
}

/** Name matching is a local display filter, not identity evidence. Never use
 * the whole collaboration index as a fallback when the departure is unknown. */
export function collaborationContext({ seed = null, artistName = "", localArtistName = "", suppressLocalArtist = false, index = [] } = {}) {
  if (!seed?.id) return { artistName: "", activeKey: "", edges: [] };
  const name = String(artistName || (seed.type === "artist" ? seed.name || seed.label || seed.title : "") || (suppressLocalArtist ? "" : localArtistName) || "").trim();
  const activeKey = artistKey(name);
  if (!activeKey) return { artistName: "", activeKey: "", edges: [] };
  return {
    artistName: name,
    activeKey,
    edges: (Array.isArray(index) ? index : []).filter((edge) => (edge.artistKeys || edge.artists?.map(artistKey) || []).includes(activeKey))
  };
}
