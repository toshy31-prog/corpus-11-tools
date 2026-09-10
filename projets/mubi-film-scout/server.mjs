import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { createConnectionStore } from "./lib/connections.mjs";
import { createExternalSourceClient } from "./lib/external-sources.mjs";
import {
  GENRES,
  LENSES,
  analyzeWish,
  buildProgramme,
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
const externalSources = createExternalSourceClient({
  guardianRoot: process.env.GUARDIAN_ROOT,
  nytRoot: process.env.NYT_ROOT,
  omdbRoot: process.env.OMDB_ROOT
});
const SOURCE_CONFIG_PATH = process.env.SOURCE_CONFIG_PATH || fileURLToPath(new URL("./.sources.local.json", import.meta.url));
const connections = createConnectionStore(SOURCE_CONFIG_PATH, process.env);
const ACTIVE_SOURCE_IDS = Object.freeze(["tmdb", "guardian", "nyt", "omdb"]);
let cachedProvider = null;
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
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
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

async function tmdb(path, token, params = new URLSearchParams()) {
  const url = new URL(`${TMDB_ROOT}${path}`);
  url.search = params;
  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/json"
    },
    signal: AbortSignal.timeout(12_000)
  });
  if (!response.ok) {
    const details = await response.json().catch(() => ({}));
    const error = new Error(details.status_message || `TMDB a répondu ${response.status}.`);
    error.status = response.status === 401 ? 401 : response.status === 429 ? 503 : 502;
    throw error;
  }
  return response.json();
}

async function findMubiProvider(token) {
  if (cachedProvider) return cachedProvider;
  const data = await tmdb("/watch/providers/movie", token, new URLSearchParams({ language: "fr-FR", watch_region: "FR" }));
  const providers = data.results || [];
  const exact = providers.find((provider) => provider.provider_name.toLocaleLowerCase("fr-FR") === "mubi");
  const fallback = providers.find((provider) => /^mubi\b/i.test(provider.provider_name));
  const provider = exact || fallback;
  if (!provider) throw new Error("MUBI n’apparaît pas dans les fournisseurs TMDB pour la France.");
  cachedProvider = provider;
  return cachedProvider;
}

async function verifyMubi(movie, providerId, token) {
  const params = new URLSearchParams({ language: "fr-FR", append_to_response: "watch/providers,keywords,external_ids" });
  const data = await tmdb(`/movie/${movie.id}`, token, params);
  const offers = data["watch/providers"]?.results?.FR;
  const flatrate = offers?.flatrate || [];
  if (!flatrate.some((provider) => provider.provider_id === providerId)) return null;
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
    title: data.title || movie.title,
    originalTitle: data.original_title || movie.original_title,
    overview: data.overview || movie.overview,
    releaseDate: data.release_date || movie.release_date,
    rating: Number(data.vote_average ?? movie.vote_average ?? 0),
    votes: Number(data.vote_count ?? movie.vote_count ?? 0),
    genreIds: Array.isArray(movie.genre_ids) ? movie.genre_ids : [],
    poster: posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : null,
    offerLink,
    keywords: (data.keywords?.keywords || []).map(({ name }) => name).filter(Boolean),
    budget: Number(data.budget || 0),
    popularity: Number(data.popularity ?? movie.popularity ?? 0),
    runtime: Number(data.runtime || 0),
    originalLanguage: data.original_language || movie.original_language || "",
    imdbId: /^tt\d{5,12}$/.test(data.external_ids?.imdb_id || "") ? data.external_ids.imdb_id : null,
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
  } catch {
    state.ok = false;
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
  const provider = await findMubiProvider(token);
  const discovery = await tmdb("/discover/movie", token, buildDiscoverParams(filters, provider.provider_id, 1));
  const exploredPages = buildExplorationPages(discovery.total_pages, filters);
  const pageSettled = await mapSettledWithConcurrency(
    exploredPages.filter((page) => page !== 1),
    4,
    (page) => tmdb("/discover/movie", token, buildDiscoverParams(filters, provider.provider_id, page))
  );
  const discoveryResults = [
    ...(discovery.results || []),
    ...pageSettled.filter(({ status }) => status === "fulfilled").flatMap(({ value }) => value.results || [])
  ];
  const uniqueResults = [...new Map(discoveryResults.map((movie) => [movie.id, movie])).values()];
  const unseenResults = uniqueResults.filter((movie) => !filters.hideSeen || !filters.seen.includes(movie.id));
  const preliminaryRanking = rankByQualitativePreferences(unseenResults, qualitative);
  const candidateLimit = { faithful: 24, sidestep: 28, adventurous: 32 }[filters.detour] || 24;
  const candidates = filters.lenses.length
    ? selectWithLenses(preliminaryRanking, filters, candidateLimit)
    : pickResults(preliminaryRanking, filters, candidateLimit);
  const settled = await mapSettledWithConcurrency(
    candidates,
    6,
    (movie) => verifyMubi(movie, provider.provider_id, token)
  );
  const failures = settled.filter(({ status }) => status === "rejected");
  if (candidates.length && failures.length === candidates.length) {
    throw httpError("TMDB n’a pas pu vérifier les disponibilités. Réessayez dans un instant.", 502);
  }
  const verified = settled
    .filter(({ status, value }) => status === "fulfilled" && value)
    .map(({ value }) => value)
    .filter((movie) => !movie.runtime || movie.runtime <= filters.maxRuntime);
  const qualitativelyRanked = rankByQualitativePreferences(verified, qualitative);
  const ranked = selectWithLenses(qualitativelyRanked, filters, 12);
  const programme = buildProgramme(ranked, filters);
  const verifiedById = new Map(verified.map((movie) => [movie.id, movie]));
  const catalogueRanking = selectWithLenses(preliminaryRanking, filters, preliminaryRanking.length);
  const catalogue = catalogueRanking.map((movie) => compactDiscoveryMovie(movie, verifiedById));
  const externalKeys = Object.fromEntries(await Promise.all(
    ["guardian", "nyt", "omdb"].map(async (id) => [id, await connections.get(id)])
  ));
  const external = await externalSources.enrich(programme, externalKeys);
  const warnings = [];
  const pageFailures = pageSettled.filter(({ status }) => status === "rejected").length;
  if (pageFailures) warnings.push(`${pageFailures} page${pageFailures > 1 ? "s" : ""} du catalogue n’${pageFailures > 1 ? "ont" : "a"} pas pu être explorée${pageFailures > 1 ? "s" : ""}.`);
  if (failures.length) warnings.push(`${failures.length} disponibilité${failures.length > 1 ? "s n’ont" : " n’a"} pas pu être vérifiée${failures.length > 1 ? "s" : ""}.`);
  for (const [source, coverage] of Object.entries(external.coverage)) {
    if (coverage.failed) warnings.push(`${source === "guardian" ? "The Guardian" : source === "nyt" ? "The New York Times" : "OMDb"} : ${coverage.failed} consultation${coverage.failed > 1 ? "s ont" : " a"} échoué.`);
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
    exploredPages,
    exploredCandidates: uniqueResults.length,
    movies: external.movies,
    catalogue,
    sourceCoverage: external.coverage,
    attribution: "Données TMDB ; disponibilités fournies par JustWatch ; critiques Guardian et NYT ; réception agrégée via OMDb."
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

server.listen(PORT, "127.0.0.1", () => {
  const address = server.address();
  const activePort = typeof address === "object" && address ? address.port : PORT;
  console.log(`MUBI Film Scout : http://127.0.0.1:${activePort}`);
  connections.get("tmdb").then((token) => {
    if (!token) console.log("Jeton TMDB : à enregistrer une fois dans le centre des sources.");
  }).catch(() => console.log("Coffre local des sources : lecture impossible."));
});
