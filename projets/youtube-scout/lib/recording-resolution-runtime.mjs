import { buildTrackSearchProjection } from "./track-search-projection.mjs";

/*
 * Frontière runtime entre :
 *
 *   - l'interprétation algébrisée moderne du morceau ;
 *   - les I/O fournisseur réalisées par server.mjs ;
 *   - le contrat historique /api/music/recording.
 *
 * Cette première jonction ne décide PAS encore à la place du moteur historique.
 * Elle choisit les requêtes à exécuter.
 *
 * Invariant :
 * une hypothèse concurrente ou une variante de recherche n'est jamais promue
 * en identité simplement parce qu'elle a été recherchée.
 */

function clean(value = "") {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/gu, " ")
    .trim();
}

function artistName(value) {
  if (typeof value === "string") return clean(value);
  return clean(value?.name);
}

function queryKey(query = {}) {
  return [
    clean(query.artist).toLocaleLowerCase(),
    clean(query.title).toLocaleLowerCase(),
    clean(query.version).toLocaleLowerCase()
  ].join("\u0000");
}

function usefulQuery(query = {}) {
  return Boolean(
    clean(query.title) &&
    (
      clean(query.artist) ||
      query.kind === "title_only_fallback"
    )
  );
}

export function runtimeRecordingPlan({
  title = "",
  artist = "",
  durationSeconds = 0,
  channelTitle = "",
  description = "",
  topic = null
} = {}) {
  /*
   * L'ancien endpoint ne possède pas toujours toutes les métadonnées YouTube.
   * probableArtist reste donc une observation séparée et non une confirmation.
   */
  const item = {
    title: clean(title),
    durationSeconds:
      Number.isFinite(Number(durationSeconds))
        ? Number(durationSeconds)
        : 0,
    channelTitle: clean(channelTitle),
    description: String(description || "").slice(0, 10000)
  };

  if (topic && typeof topic === "object") {
    Object.assign(item, topic);
  }

  /*
   * Un artiste connu par le contexte appelant est injecté comme métadonnée
   * d'aide à la recherche, pas comme externalId ni identité canonique.
   *
   * Les modules actuels savent exploiter les champs structurés lorsqu'ils sont
   * présents. Pour le chemin historique, on conserve aussi un fallback contrôlé
   * plus bas si la projection moderne ne produit aucune requête artistée.
   */
  const projection = buildTrackSearchProjection(item);

  const projectedQueries =
    projection?.queries ||
    projection?.projectedQueries ||
    [];

  const queries = [];
  const seen = new Set();

  // V2.7R7 — CALLER ARTIST PROJECTION: requête seulement, jamais identité.
  const callerArtist = clean(artist);
  let callerTitle = "";
  if (callerArtist) {
    const segments = clean(title)
      .split(/\s+(?:-|–|—)\s+/u)
      .map((segment) => clean(segment).replace(/^[\s"“”‘’]+|[\s"“”‘’]+$/gu, ""))
      .filter(Boolean);
    const callerKey = callerArtist.toLocaleLowerCase();
    const callerIndex = segments.findIndex((segment) => segment.toLocaleLowerCase() === callerKey);
    if (callerIndex > 0) callerTitle = segments[callerIndex - 1];
  }

  const add = (query) => {
    if (!usefulQuery(query)) return;

    const normalized = {
      kind: clean(query.kind) || "projected",
      artist: clean(query.artist),
      title: clean(query.title),
      version: clean(query.version),
      catalogueCode: clean(query.catalogueCode),
      weight:
        Number.isFinite(Number(query.weight))
          ? Number(query.weight)
          : 0,
      transformations:
        Array.isArray(query.transformations)
          ? [...query.transformations]
          : [],
      basis:
        Array.isArray(query.basis)
          ? [...query.basis]
          : []
    };

    const key = queryKey(normalized);
    if (seen.has(key)) return;

    seen.add(key);
    queries.push(normalized);
  };

  if (callerArtist && callerTitle) {
    add({
      kind: "runtime_caller_artist_projection",
      artist: callerArtist, title: callerTitle, version: "", weight: 2,
      transformations: ["caller_artist_boundary"],
      basis: ["caller_probable_artist", "preceding_title_segment"]
    });
  }

  for (const query of projectedQueries) {
    add(query);
  }

  /*
   * Compatibilité transitoire :
   *
   * l'appel actuel du front connaît souvent déjà probableArtist alors que
   * /api/music/recording ne reçoit ni description Topic ni header structuré.
   *
   * Si cette information n'a pas pu entrer dans la projection algébrisée,
   * elle est conservée comme REQUÊTE seulement.
   */
  if (
    clean(artist) &&
    clean(title) &&
    !queries.some((query) => clean(query.artist).toLocaleLowerCase() === callerArtist.toLocaleLowerCase())
  ) {
    add({
      kind: "runtime_known_artist_fallback",
      artist: clean(artist),
      title: clean(title),
      version: "",
      weight: 1.5,
      transformations: ["runtime_context_artist"],
      basis: ["caller_probable_artist"]
    });
  }

  queries.sort(
    (a, b) =>
      b.weight - a.weight ||
      Number(Boolean(b.artist)) - Number(Boolean(a.artist))
  );

  return {
    projection,
    queries,
    durationMs: item.durationSeconds > 0 ? Math.round(item.durationSeconds * 1000) : null
  };
}

export function primaryRuntimeQuery(plan = {}) {
  return (plan.queries || []).find(
    (query) =>
      clean(query.artist) &&
      clean(query.title)
  ) || null;
}

export function secondaryRuntimeQuery(plan = {}, primary = null) {
  const primaryKey = primary ? queryKey(primary) : "";

  return (plan.queries || []).find(
    (query) =>
      clean(query.artist) &&
      clean(query.title) &&
      queryKey(query) !== primaryKey
  ) || null;
}

export function preferredArtistsFromPlan(plan = {}) {
  const resolution =
    plan.projection?.resolution ||
    plan.projection?.interpreted ||
    plan.projection ||
    {};

  return (resolution.preferredArtists || [])
    .map(artistName)
    .filter(Boolean);
}
