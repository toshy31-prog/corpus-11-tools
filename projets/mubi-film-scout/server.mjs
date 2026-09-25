import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { createConnectionStore } from "./lib/connections.mjs";
import { SERVICE_ID } from "./lib/server-readiness.mjs";
import { createExternalSourceClient, sourceFailure } from "./lib/external-sources.mjs";
import { evaluateProgramme } from "./lib/quality.mjs";
import { createPersistentCache } from "./lib/persistent-cache.mjs";
import { APP_VERSION, instanceId } from "./lib/identity.mjs";
import { prioritizeIntent } from "./public/discovery.mjs";
import {
  GENRES,
  LENSES,
  analyzeWish,
  buildExpandedProgramme,
  broadenCandidates,
  buildDiscoverParams,
  buildExplorationPages,
  describeFilters,
  normalizeFilters,
  pickResults,
  rankByQualitativePreferences,
  selectWithLenses
} from "./lib/search.mjs";

const ROOT = fileURLToPath(new URL("./public/", import.meta.url));
const PORT = Number(process.env.PORT || 4180);
const TMDB_ROOT = process.env.TMDB_ROOT || "https://api.themoviedb.org/3";
const diskCache = createPersistentCache(process.env.CACHE_PATH || fileURLToPath(new URL("./.runtime/catalogue-cache.json", import.meta.url)));
const externalSources = createExternalSourceClient({
  guardianRoot: process.env.GUARDIAN_ROOT,
  nytRoot: process.env.NYT_ROOT,
  omdbRoot: process.env.OMDB_ROOT,
  persistentCache: diskCache
});
const SOURCE_CONFIG_PATH = process.env.SOURCE_CONFIG_PATH || fileURLToPath(new URL("./.sources.local.json", import.meta.url));
const connections = createConnectionStore(SOURCE_CONFIG_PATH, process.env);
const ACTIVE_SOURCE_IDS = Object.freeze(["tmdb", "guardian", "nyt", "omdb"]);
let cachedProvider = null;
const tmdbCache = new Map();
const TMDB_CACHE_TTL_MS = 5 * 60 * 1000;
const runtimeStatus = {
  startedAt: new Date().toISOString(),
  lastTmdbCheckAt: null,
  lastTmdbCheckOk: null,
  lastTmdbLatencyMs: null,
  lastSuccessfulSearchAt: null,
  lastFailedSearchAt: null,
  sourceChecks: Object.fromEntries(ACTIVE_SOURCE_IDS.map((id) => [id, {
    lastCheckAt: null,
    ok: null,
    latencyMs: null
  }]))
};
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
  , ".json": "application/json; charset=utf-8"
};

const SECURITY_HEADERS = {
  "content-security-policy": "default-src 'self'; img-src 'self' https://image.tmdb.org data:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY"
};

function httpError(message, status = 500) {
  return Object.assign(new Error(message), { status });
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    ...SECURITY_HEADERS,
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 64_000) throw httpError("Requête trop volumineuse.", 413);
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw httpError("Le corps de la requête n’est pas un JSON valide.", 400);
  }
}

async function requestToken(request) {
  const supplied = request.headers["x-tmdb-token"];
  const temporaryToken = (Array.isArray(supplied) ? supplied[0] : supplied || "").trim();
  return temporaryToken || connections.get("tmdb");
}

function requestAbortSignal(request) {
  const controller = new AbortController();
  request.once("aborted", () => controller.abort());
  return controller.signal;
}

async function tmdb(path, token, params = new URLSearchParams(), signal) {
  const url = new URL(`${TMDB_ROOT}${path}`);
  url.search = params;
  const cacheKey = `${url.href}:${token}`;
  const cached = tmdbCache.get(cacheKey);
  if (cached && Date.now() - cached.savedAt < TMDB_CACHE_TTL_MS) return cached.data;
  if (cached) tmdbCache.delete(cacheKey);
  const stored = await diskCache.get(cacheKey);
  if (stored) return { ...stored.data, scoutFetchedAt: new Date(stored.savedAt).toISOString() };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  const abort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", abort, { once: true });
  }
  try {
    const response = await fetch(url, {
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/json"
      },
      signal: controller.signal
    });
    if (!response.ok) {
      const details = await response.json().catch(() => ({}));
      const error = new Error(details.status_message || `TMDB a répondu ${response.status}.`);
      error.status = response.status === 401 ? 401 : response.status === 429 ? 503 : 502;
      throw error;
    }
    const data = await response.json();
    const ttl = path === "/configuration" || path === "/watch/providers/movie" ? 86400_000 : 900_000;
    await diskCache.set(cacheKey, data, ttl).catch(() => {});
    data.scoutFetchedAt = new Date().toISOString();
    tmdbCache.set(cacheKey, { savedAt: Date.now(), data });
    if (tmdbCache.size > 500) tmdbCache.delete(tmdbCache.keys().next().value);
    return data;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

async function findMubiProvider(token, signal) {
  if (cachedProvider) return cachedProvider;
  const data = await tmdb("/watch/providers/movie", token, new URLSearchParams({ language: "fr-FR", watch_region: "FR" }), signal);
  const providers = data.results || [];
  const exact = providers.find((provider) => provider.provider_name.toLocaleLowerCase("fr-FR") === "mubi");
  const fallback = providers.find((provider) => /^mubi\b/i.test(provider.provider_name));
  const provider = exact || fallback;
  if (!provider) throw new Error("MUBI n’apparaît pas dans les fournisseurs TMDB pour la France.");
  cachedProvider = provider;
  return cachedProvider;
}

async function verifyMubi(movie, providerId, token, signal, requireAvailable = true) {
  const params = new URLSearchParams({ language: "fr-FR", append_to_response: "watch/providers,keywords,external_ids,credits,alternative_titles" });
  const data = await tmdb(`/movie/${movie.id}`, token, params, signal);
  const offers = data["watch/providers"]?.results?.FR;
  const flatrate = offers?.flatrate || [];
  const available = flatrate.some((provider) => provider.provider_id === providerId);
  if (!available && requireAvailable) return null;
  const fallbackOffer = `https://www.themoviedb.org/movie/${movie.id}/watch?locale=FR`;
  let offerLink = fallbackOffer;
  try {
    const parsed = new URL(offers.link || fallbackOffer);
    if (parsed.protocol === "https:" && /(^|\.)themoviedb\.org$/i.test(parsed.hostname)) offerLink = parsed.href;
  } catch {
    offerLink = fallbackOffer;
  }
  const posterPath = typeof data.poster_path === "string" && /^\/[A-Za-z0-9._/-]+$/.test(data.poster_path)
    ? data.poster_path
    : null;
  return {
    id: movie.id,
    collectionId: data.belongs_to_collection?.id || null,
    verified: available,
    checkedAt: data.scoutFetchedAt || new Date().toISOString(),
    availability: { country: "FR", provider: "MUBI", type: "subscription", available, source: "TMDB / JustWatch" },
    audioLanguages: null,
    subtitles: null,
    title: data.title || movie.title,
    originalTitle: data.original_title || movie.original_title,
    overview: data.overview || movie.overview,
    releaseDate: data.release_date || movie.release_date,
    rating: Number(data.vote_average ?? movie.vote_average ?? 0),
    votes: Number(data.vote_count ?? movie.vote_count ?? 0),
    genreIds: Array.isArray(data.genres) ? data.genres.map(({ id }) => id) : movie.genre_ids || [],
    alternativeTitles: (data.alternative_titles?.titles || []).filter((t) => ["US", "GB", "FR"].includes(t.iso_3166_1)).map((t) => t.title).slice(0, 6),
    poster: posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : null,
    offerLink,
    keywords: (data.keywords?.keywords || []).map(({ name }) => name).filter(Boolean),
    budget: Number(data.budget || 0),
    popularity: Number(data.popularity ?? movie.popularity ?? 0),
    runtime: Number(data.runtime || 0),
    originalLanguage: data.original_language || movie.original_language || "",
    imdbId: /^tt\d{5,12}$/.test(data.external_ids?.imdb_id || "") ? data.external_ids.imdb_id : null,
    director: (data.credits?.crew || []).find(({ job }) => job === "Director")?.name || null,
    cast: (data.credits?.cast || []).slice(0, 8).map(({ name, character }) => ({ name, character })),
    productionCountries: (data.production_countries || []).map(({ iso_3166_1 }) => iso_3166_1).filter(Boolean)
  };
}

function compactDiscoveryMovie(movie, verifiedById) {
  const verified = verifiedById.get(movie.id);
  return {
    id: movie.id,
    title: movie.title || movie.original_title || "Sans titre",
    originalTitle: movie.original_title || movie.title || "",
    overview: movie.overview || "",
    releaseDate: movie.release_date || "",
    rating: Number(movie.vote_average) || 0,
    votes: Number(movie.vote_count) || 0,
    poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
    originalLanguage: movie.original_language || "",
    genreIds: movie.genre_ids || [],
    why: movie.why || [],
    verified: Boolean(verified),
    runtime: Number(verified?.runtime || 0),
    checkedAt: verified?.checkedAt || null,
    ...(verified || {}),
    offerLink: verified?.offerLink || `https://www.themoviedb.org/movie/${movie.id}/watch?locale=FR`
  };
}

async function mapSettledWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function consume() {
    while (cursor < items.length) {
      const index = cursor++;
      try {
        results[index] = { status: "fulfilled", value: await worker(items[index], index) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, consume));
  return results;
}

function diagnosticSnapshot(connectionStatus = {}) {
  return {
    server: true,
    tmdbConfigured: Boolean(connectionStatus.tmdb?.configured),
    ...runtimeStatus,
    sourceChecks: Object.fromEntries(ACTIVE_SOURCE_IDS.map((id) => [id, {
      configured: Boolean(connectionStatus[id]?.configured),
      ...runtimeStatus.sourceChecks[id]
    }]))
  };
}

async function recordSourceCheck(id, task) {
  const started = Date.now();
  const state = runtimeStatus.sourceChecks[id];
  state.lastCheckAt = new Date().toISOString();
  try {
    await task();
    state.ok = true;
    state.error = null;
  } catch (error) {
    state.ok = false;
    state.error = sourceFailure(error);
  }
  state.latencyMs = Date.now() - started;
  if (id === "tmdb") {
    runtimeStatus.lastTmdbCheckAt = state.lastCheckAt;
    runtimeStatus.lastTmdbCheckOk = state.ok;
    runtimeStatus.lastTmdbLatencyMs = state.latencyMs;
  }
  return state.ok;
}

async function handleDiagnostic(request, response) {
  const token = await requestToken(request);
  const credentials = {
    tmdb: token,
    guardian: await connections.get("guardian"),
    nyt: await connections.get("nyt"),
    omdb: await connections.get("omdb")
  };
  const connectionStatus = await connections.status();
  if (token) connectionStatus.tmdb.configured = true;
  const configured = ACTIVE_SOURCE_IDS.filter((id) => credentials[id]);
  if (!configured.length) {
    return sendJson(response, 428, {
      code: "TOKEN_REQUIRED",
      message: "Enregistrez d’abord au moins une source.",
      diagnostics: diagnosticSnapshot(connectionStatus)
    });
  }
  const tests = {
    tmdb: () => tmdb("/configuration", credentials.tmdb),
    guardian: () => externalSources.check("guardian", credentials.guardian),
    nyt: () => externalSources.check("nyt", credentials.nyt),
    omdb: () => externalSources.check("omdb", credentials.omdb)
  };
  const results = await Promise.all(configured.map(async (id) => [id, await recordSourceCheck(id, tests[id])]));
  const failed = results.filter(([, ok]) => !ok).map(([id]) => id);
  return sendJson(response, 200, {
    diagnostics: diagnosticSnapshot(connectionStatus),
    summary: { tested: configured.length, operational: configured.length - failed.length, failed }
  });
}

async function handleSearch(request, response) {
  const signal = requestAbortSignal(request);
  const token = await requestToken(request);
  if (!token) {
    return sendJson(response, 428, {
      code: "TOKEN_REQUIRED",
      message: "Ajoutez votre jeton de lecture TMDB pour lancer une recherche réelle."
    });
  }

  const body = await readJson(request);
  const analysis = analyzeWish(body.wish, normalizeFilters(body.filters));
  const { filters, qualitative } = analysis;
  const provider = await findMubiProvider(token, signal);
  const discovery = await tmdb("/discover/movie", token, buildDiscoverParams(filters, provider.provider_id, 1), signal);
  const attemptedPages = buildExplorationPages(discovery.total_pages, filters);
  const additionalPages = attemptedPages.filter((page) => page !== 1);
  const pageSettled = await mapSettledWithConcurrency(
    additionalPages,
    4,
    (page) => tmdb("/discover/movie", token, buildDiscoverParams(filters, provider.provider_id, page), signal)
  );
  const exploredPages = [1, ...additionalPages.filter((_, index) => pageSettled[index].status === "fulfilled")];
  const discoveryResults = [
    ...(discovery.results || []),
    ...pageSettled.filter(({ status }) => status === "fulfilled").flatMap(({ value }) => value.results || [])
  ];
  const uniqueResults = [...new Map(discoveryResults.map((movie) => [movie.id, movie])).values()];
  const unseenResults = uniqueResults.filter((movie) => !filters.hideSeen || !filters.seen.includes(movie.id));
  const preliminaryRanking = rankByQualitativePreferences(unseenResults, qualitative);
  const candidateLimit = { faithful: 24, sidestep: 28, adventurous: 32 }[filters.detour] || 24;
  const candidateRanking = filters.lenses.length
    ? selectWithLenses(preliminaryRanking, filters, preliminaryRanking.length)
    : pickResults(preliminaryRanking, filters, preliminaryRanking.length);
  const candidates = broadenCandidates(prioritizeIntent(candidateRanking, filters.effect), filters, candidateLimit);
  const settled = await mapSettledWithConcurrency(
    candidates,
    6,
    (movie) => verifyMubi(movie, provider.provider_id, token, signal)
  );
  const failures = settled.filter(({ status }) => status === "rejected");
  if (candidates.length && failures.length === candidates.length) {
    throw httpError("TMDB n’a pas pu vérifier les disponibilités. Réessayez dans un instant.", 502);
  }
  const verified = settled
    .filter(({ status, value }) => status === "fulfilled" && value)
    .map(({ value }) => value)
    .filter((movie) => movie.runtime > 0 && movie.runtime <= filters.maxRuntime)
    .filter((movie) => Number(movie.releaseDate?.slice(0, 4)) >= filters.minYear && Number(movie.releaseDate?.slice(0, 4)) <= filters.maxYear)
    .filter((movie) => movie.rating >= filters.minRating && movie.votes >= filters.minVotes)
    .filter((movie) => !filters.genres.length || movie.genreIds.some((id) => filters.genres.includes(id)));
  const qualitativelyRanked = rankByQualitativePreferences(verified, qualitative);
  const ranked = selectWithLenses(qualitativelyRanked, filters, qualitativelyRanked.length);
  const programme = buildExpandedProgramme(ranked, filters);
  const verifiedById = new Map(verified.map((movie) => [movie.id, movie]));
  const catalogueRanking = selectWithLenses(preliminaryRanking, filters, preliminaryRanking.length);
  const catalogue = catalogueRanking.map((movie) => compactDiscoveryMovie(movie, verifiedById));
  const externalKeys = Object.fromEntries(await Promise.all(
    ["guardian", "nyt", "omdb"].map(async (id) => [id, await connections.get(id)])
  ));
  const external = body.progressive ? { movies: programme, coverage: {} } : await externalSources.enrich(programme, externalKeys);
  const warnings = [];
  const pageFailures = pageSettled.filter(({ status }) => status === "rejected").length;
  if (pageFailures) warnings.push(`${pageFailures} page${pageFailures > 1 ? "s" : ""} du catalogue n’${pageFailures > 1 ? "ont" : "a"} pas pu être explorée${pageFailures > 1 ? "s" : ""}.`);
  if (failures.length) warnings.push(`${failures.length} disponibilité${failures.length > 1 ? "s n’ont" : " n’a"} pas pu être vérifiée${failures.length > 1 ? "s" : ""}.`);
  for (const [source, coverage] of Object.entries(external.coverage)) {
    if (coverage.failed) warnings.push(`${source === "guardian" ? "The Guardian" : source === "nyt" ? "The New York Times" : "OMDb"} : ${coverage.failed} consultation${coverage.failed > 1 ? "s" : ""} indisponible${coverage.failed > 1 ? "s" : ""} (${(coverage.errors || []).map(({ message }) => message).join(" ; ") || "erreur temporaire"}).`);
  }
  runtimeStatus.lastSuccessfulSearchAt = new Date().toISOString();

  return sendJson(response, 200, {
    provider: { id: provider.provider_id, name: provider.provider_name },
    filters,
    applied: [
      ...describeFilters(filters),
      ...qualitative.map(({ label }) => `≈ ${label}`),
      ...filters.lenses.map((id) => `↗ ${LENSES.find((lens) => lens.id === id)?.label}`).filter(Boolean),
      `${uniqueResults.length} titres explorés`
    ],
    interpretationNotice: analysis.notice,
    warnings,
    totalResults: discovery.total_results || 0,
    totalPages: Math.min(500, Number(discovery.total_pages) || 1),
    fetchedAt: new Date().toISOString(),
    exploredPages,
    exploredCandidates: uniqueResults.length,
    movies: external.movies,
    pool: ranked,
    enrichmentPending: Boolean(body.progressive),
    qualityChecks: evaluateProgramme(external.movies, filters),
    catalogue,
    sourceCoverage: external.coverage,
    attribution: "Données TMDB ; disponibilités fournies par JustWatch ; critiques Guardian et NYT ; réception agrégée via OMDb."
  });
}

async function handleMovie(request, response, enrich = false) {
  const body = await readJson(request);
  const requestedIds = enrich ? body.ids : [body.id];
  if (!Array.isArray(requestedIds) || !requestedIds.length || requestedIds.length > 4 || requestedIds.some((id) => !Number.isSafeInteger(id) || id <= 0)) throw httpError("Un à quatre identifiants TMDB entiers positifs attendus.", 400);
  const token = await requestToken(request);
  if (!token) throw httpError("TMDB à connecter.", 428);
  const provider = await findMubiProvider(token);
  const settled = await mapSettledWithConcurrency([...new Set(requestedIds)], 4, (id) => verifyMubi({ id }, provider.provider_id, token, undefined, false));
  const movies = settled.filter((r) => r.status === "fulfilled").map((r) => r.value);
  if (!movies.length) throw httpError("Détails temporairement indisponibles.", 502);
  if (!enrich) return sendJson(response, 200, { movie: movies[0] });
  const keys = Object.fromEntries(await Promise.all(["guardian", "nyt", "omdb"].map(async (id) => [id, await connections.get(id)])));
  return sendJson(response, 200, await externalSources.enrich(movies, keys));
}

async function handleRelaxations(request, response) {
  const body = await readJson(request);
  const token = await requestToken(request);
  if (!token) throw httpError("TMDB à connecter.", 428);
  const filters = analyzeWish(body.wish, normalizeFilters(body.filters)).filters;
  const provider = await findMubiProvider(token);
  const variants = [
    { label: "Toutes les époques", filters: { ...filters, minYear: 1874, maxYear: new Date().getFullYear() } },
    { label: "Sans seuil de notes ni de votes", filters: { ...filters, minRating: 0, minVotes: 0 } },
    { label: "Tous les genres", filters: { ...filters, genres: [] } }
  ].filter((v) => JSON.stringify(v.filters) !== JSON.stringify(filters));
  const results = await mapSettledWithConcurrency(variants, 3, async (variant) => {
    const data = await tmdb("/discover/movie", token, buildDiscoverParams(variant.filters, provider.provider_id));
    return { ...variant, total: data.total_results || 0, scope: "Total source, avant exclusion des films vus et vérification détaillée ; durée conservée." };
  });
  sendJson(response, 200, { alternatives: results.filter((r) => r.status === "fulfilled").map((r) => r.value), failed: results.filter((r) => r.status === "rejected").length });
}

// Optional LLM: fixed administrator-configured local endpoint, never a URL supplied in a request.
async function handleLanguage(request, response) {
  const body = await readJson(request);
  if (typeof body.text !== "string" || body.text.length > 2000) throw httpError("Texte limité à 2 000 caractères.", 400);
  if (!process.env.SCOUT_LLM_URL || !process.env.SCOUT_LLM_MODEL) throw httpError("Aucun modèle local configuré. Le vocabulaire assisté reste disponible.", 428);
  const url = new URL(process.env.SCOUT_LLM_URL);
  if (url.protocol !== "http:" || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw httpError("Seul un serveur LLM local est autorisé.", 400);
  const result = await fetch(url, { method: "POST", redirect: "error", signal: AbortSignal.timeout(30_000), headers: { "content-type": "application/json" }, body: JSON.stringify({ model: process.env.SCOUT_LLM_MODEL, temperature: 0, messages: [{ role: "system", content: 'Translate the French request into a JSON object containing only filters: minYear,maxYear,maxRuntime,genres (TMDB integer IDs),effect (open,captivate,contemplate,comfort,shake,wonder). Omit unknown fields. Never suggest films or availability. Return JSON only.' }, { role: "user", content: body.text }] }) });
  if (!result.ok) throw httpError("Le modèle local n’a pas répondu correctement.", 502);
  const data = await result.json();
  let raw;
  try { raw = JSON.parse(String(data.choices?.[0]?.message?.content || "").replace(/^```(?:json)?\s*|\s*```$/g, "")); } catch { throw httpError("Réponse du modèle non interprétable ; aucun critère appliqué.", 502); }
  const values = raw.filters || raw;
  const allowed = Object.fromEntries(Object.entries(values).filter(([key]) => ["minYear", "maxYear", "maxRuntime", "genres", "effect"].includes(key)));
  const filters = normalizeFilters({ ...body.filters, ...allowed });
  sendJson(response, 200, { filters, notice: "Proposition d’un modèle local, à vérifier avant application. Aucune disponibilité inférée." });
}

async function handleCatalogue(request, response) {
  const signal = requestAbortSignal(request);
  const token = await requestToken(request);
  if (!token) return sendJson(response, 428, { code: "TOKEN_REQUIRED", message: "Ajoutez votre jeton TMDB." });
  const body = await readJson(request);
  const page = Math.max(1, Math.min(500, Math.floor(Number(body.page) || 1)));
  const analysis = analyzeWish(body.wish, normalizeFilters(body.filters));
  const provider = await findMubiProvider(token, signal);
  const discovery = await tmdb("/discover/movie", token, buildDiscoverParams(analysis.filters, provider.provider_id, page), signal);
  const unseen = (discovery.results || []).filter((movie) => (
    !analysis.filters.hideSeen || !analysis.filters.seen.includes(movie.id)
  ));
  const ranked = selectWithLenses(
    rankByQualitativePreferences(unseen, analysis.qualitative),
    analysis.filters,
    unseen.length
  );
  return sendJson(response, 200, {
    page,
    totalPages: Math.min(500, Number(discovery.total_pages) || 1),
    totalResults: Number(discovery.total_results) || 0,
    fetchedAt: new Date().toISOString(),
    movies: ranked.map((movie) => compactDiscoveryMovie(movie, new Map()))
  });
}

async function serveStatic(request, response) {
  const pathname = new URL(request.url, "http://localhost").pathname;
  const requested = pathname === "/" ? "index.html" : pathname.slice(1);
  const safePath = normalize(requested).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = join(ROOT, safePath);
  try {
    const content = await readFile(filePath);
    response.writeHead(200, { ...SECURITY_HEADERS, "content-type": MIME[extname(filePath)] || "application/octet-stream" });
    response.end(content);
  } catch {
    response.writeHead(404, { ...SECURITY_HEADERS, "content-type": "text/plain; charset=utf-8" });
    response.end("Introuvable");
  }
}

const server = http.createServer(async (request, response) => {
  try {
    const allowedHosts = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);
    if (!allowedHosts.has(request.headers.host || "")) return sendJson(response, 403, { message: "Hôte local non autorisé." });
    const origin = request.headers.origin;
    if (request.method === "POST" && origin && ![`http://127.0.0.1:${PORT}`, `http://localhost:${PORT}`].includes(origin)) {
      return sendJson(response, 403, { message: "Origine non autorisée." });
    }
    if (request.method === "GET" && request.url === "/api/status") {
      const connectionStatus = await connections.status();
      return sendJson(response, 200, {
        service: SERVICE_ID,
        app: "mubi-film-scout",
        version: APP_VERSION,
        instanceId: instanceId(fileURLToPath(new URL(".", import.meta.url))),
        llmConfigured: Boolean(process.env.SCOUT_LLM_URL && process.env.SCOUT_LLM_MODEL),
        connections: connectionStatus,
        diagnostics: diagnosticSnapshot(connectionStatus),
        genres: GENRES,
        lenses: LENSES
      });
    }
    if (request.method === "POST" && request.url === "/api/connections/save") {
      const body = await readJson(request);
      return sendJson(response, 200, { connections: await connections.save(body.connections) });
    }
    if (request.method === "POST" && request.url === "/api/connections/clear") {
      return sendJson(response, 200, { connections: await connections.clear() });
    }
    if (request.method === "POST" && request.url === "/api/diagnostics/run") return await handleDiagnostic(request, response);
    if (request.method === "POST" && request.url === "/api/movie") return await handleMovie(request, response);
    if (request.method === "POST" && request.url === "/api/enrich") return await handleMovie(request, response, true);
    if (request.method === "POST" && request.url === "/api/relaxations") return await handleRelaxations(request, response);
    if (request.method === "POST" && request.url === "/api/language") return await handleLanguage(request, response);
    if (request.method === "POST" && request.url === "/api/interpret") {
      const body = await readJson(request);
      return sendJson(response, 200, analyzeWish(String(body.wish || "").slice(0, 2000), normalizeFilters(body.filters)));
    }
    if (request.method === "POST" && request.url === "/api/catalogue") return await handleCatalogue(request, response);
    if (request.method === "POST" && request.url === "/api/search") {
      try {
        return await handleSearch(request, response);
      } catch (error) {
        runtimeStatus.lastFailedSearchAt = new Date().toISOString();
        throw error;
      }
    }
    if (request.method === "GET") return await serveStatic(request, response);
    return sendJson(response, 405, { message: "Méthode non autorisée." });
  } catch (error) {
    return sendJson(response, error.status || 500, { message: error.message || "Erreur inattendue." });
  }
});

server.on("error", (error) => {
  console.error(error.code === "EADDRINUSE" ? `Le port ${PORT} est déjà occupé. Utilisez npm run launch pour rejoindre votre instance, ou arrêtez l’ancienne instance de ce projet.` : "Impossible de démarrer le serveur local.");
  process.exitCode = 1;
});
server.listen(PORT, "127.0.0.1", () => {
  const address = server.address();
  const activePort = typeof address === "object" && address ? address.port : PORT;
  console.log(`MUBI Film Scout : http://127.0.0.1:${activePort}`);
  connections.get("tmdb").then((token) => {
    if (!token) console.log("Jeton TMDB : à enregistrer une fois dans le centre des sources.");
  }).catch(() => console.log("Coffre local des sources : lecture impossible."));
});
