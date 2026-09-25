const SOURCE_LABELS = Object.freeze({
  guardian: "The Guardian",
  nyt: "The New York Times",
  omdb: "OMDb"
});

const TITLE_STOP_WORDS = new Set([
  "a", "an", "and", "de", "des", "du", "film", "la", "le", "les", "movie", "of", "review", "the"
]);

function normalizeText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function titleTokens(value) {
  return normalizeText(value).split(/\s+/).filter((token) => token.length > 1 && !TITLE_STOP_WORDS.has(token));
}

export function titleMatches(movie, candidateText) {
  const haystack = normalizeText(candidateText);
  if (!haystack) return false;
  const variants = [...new Set([movie.originalTitle, movie.title, ...(movie.alternativeTitles || [])].filter(Boolean))];
  return variants.some((variant) => {
    const normalized = normalizeText(variant);
    if (normalized.length >= 4 && haystack.includes(normalized)) return true;
    const tokens = titleTokens(variant);
    if (!tokens.length) return false;
    const present = tokens.filter((token) => new RegExp(`(^| )${token}( |$)`).test(haystack)).length;
    // Un mot isolé est trop ambigu pour constituer à lui seul une identité de film.
    // Il reste accepté lorsqu'il apparaît comme expression exacte ci-dessus, puis
    // les clients Guardian/NYT exigent séparément un contexte de critique cinéma.
    return tokens.length === 1 ? false : present / tokens.length >= 0.8;
  });
}

function articleYear(value) {
  return /^\d{4}/.test(value || "") ? Number(String(value).slice(0, 4)) : null;
}

function filmReviewIdentity(movie, item, source) {
  const headline = source === "guardian"
    ? `${item.webTitle || ""} ${item.fields?.headline || ""}`
    : `${item.headline?.main || ""} ${item.headline?.print_headline || ""}`;
  const supportingText = source === "guardian"
    ? `${headline} ${item.fields?.trailText || ""}`
    : [headline, item.abstract, item.lead_paragraph, item.snippet].filter(Boolean).join(" ");
  if (!titleMatches(movie, headline)) return null;

  const normalizedHeadline = normalizeText(headline);
  const reviewContext = source === "guardian"
    ? /\breview\b|\bcritique\b/.test(normalizedHeadline)
      || item.sectionId === "film"
      || (item.tags || []).some((tag) => tag.id === "tone/reviews")
    : /\breview\b|\bcritique\b/.test(normalizedHeadline)
      || item.type_of_material === "Review"
      || item.section_name === "Movies"
      || item.news_desk === "Culture"
      || /\/movies\//.test(item.web_url || "");
  if (!reviewContext) return null;

  const movieYear = Number(releaseYear(movie)) || null;
  const publishedYear = articleYear(source === "guardian" ? item.webPublicationDate : item.pub_date);
  const director = normalizeText(movie.director || "");
  const directorPresent = Boolean(director && normalizeText(supportingText).includes(director));
  const yearCompatible = !movieYear || !publishedYear || Math.abs(movieYear - publishedYear) <= 2;
  if (!yearCompatible && !directorPresent) return null;

  const evidence = ["titre exact", "contexte de critique cinéma"];
  if (movieYear && publishedYear) evidence.push(yearCompatible ? "année compatible" : "réalisateur confirmé");
  else if (directorPresent) evidence.push("réalisateur confirmé");
  return {
    certainty: yearCompatible && movieYear && publishedYear ? "exact" : "probable",
    evidence
  };
}

function decodeEntities(value) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function plainText(value = "", limit = 240) {
  const text = decodeEntities(String(value).replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit - 1).trimEnd()}…` : text;
}

function safeHttpsUrl(value, hosts) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && hosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function sourceFailure(error) {
  const status = Number(error?.status);
  const code = status === 401 || status === 403 ? "access"
    : status === 429 ? "quota"
    : error?.name === "TimeoutError" || error?.name === "AbortError" ? "timeout"
    : status >= 500 ? "service" : status >= 400 ? "request" : "network";
  const messages = {
    access: "accès refusé ; vérifier la clé et les autorisations",
    quota: "quota atteint ; réessayer plus tard",
    timeout: "délai de réponse dépassé",
    service: "service temporairement indisponible",
    request: "requête refusée par le service",
    network: "connexion réseau interrompue"
  };
  return { code, message: messages[code] };
}

function sourceError(source, status) {
  return Object.assign(new Error(`${SOURCE_LABELS[source]} n’a pas répondu correctement.`), { source, status });
}

async function fetchJson(url, source, fetchImpl) {
  // One retry shares the original time budget; never retry refused keys or quotas.
  const signal = AbortSignal.timeout(8_000);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetchImpl(url, { headers: { accept: "application/json" }, signal });
      if (!response.ok) {
        const error = sourceError(source, response.status);
        const retryAfter = response.headers?.get?.("retry-after");
        if (retryAfter) {
          const seconds = Number(retryAfter);
          error.retryAfterMs = Number.isFinite(seconds) ? seconds * 1000 : Math.max(0, Date.parse(retryAfter) - Date.now());
        }
        throw error;
      }
      try {
        return await response.json();
      } catch {
        throw sourceError(source, 502);
      }
    } catch (error) {
      const { code } = sourceFailure(error);
      if (attempt || signal.aborted || !["network", "service"].includes(code)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
}

function queryTitle(movie) {
  return movie.originalTitle || movie.title;
}

function releaseYear(movie) {
  return /^\d{4}/.test(movie.releaseDate || "") ? movie.releaseDate.slice(0, 4) : "";
}

export async function guardianReview(movie, key, options = {}) {
  const root = options.root || "https://content.guardianapis.com/search";
  const fetchImpl = options.fetchImpl || fetch;
  const variants = [...new Set([movie.originalTitle, movie.title, ...(movie.alternativeTitles || [])].filter(Boolean))].slice(0, 5);
  const params = new URLSearchParams({
    "api-key": key,
    q: variants.map((title) => `"${title.replaceAll('"', "")}"`).join(" OR "),
    tag: "film/film,tone/reviews",
    "page-size": "5",
    "order-by": "relevance",
    "show-fields": "starRating,headline,trailText,byline,short-url",
    "show-tags": "all"
  });
  const data = await fetchJson(new URL(`?${params}`, root), "guardian", fetchImpl);
  if (data.response?.status !== "ok") throw sourceError("guardian", 502);
  const matched = (data.response.results || [])
    .map((item) => ({ item, match: filmReviewIdentity(movie, item, "guardian") }))
    .find(({ match }) => match);
  if (!matched) return null;
  const { item: result, match } = matched;
  const rating = Number(result.fields?.starRating);
  return {
    source: "guardian",
    label: SOURCE_LABELS.guardian,
    kind: "Critique",
    headline: plainText(result.fields?.headline || result.webTitle, 180),
    summary: plainText(result.fields?.trailText, 220),
    byline: plainText(result.fields?.byline, 100),
    publishedAt: result.webPublicationDate || null,
    url: safeHttpsUrl(result.fields?.shortUrl || result.webUrl, ["theguardian.com"]),
    rating: Number.isFinite(rating) && rating >= 0 && rating <= 5 ? `${rating}/5` : null,
    match
  };
}

export async function nytReview(movie, key, options = {}) {
  const root = options.root || "https://api.nytimes.com/svc/search/v2/articlesearch.json";
  const fetchImpl = options.fetchImpl || fetch;
  const params = new URLSearchParams({
    "api-key": key,
    q: [...new Set([movie.originalTitle, movie.title, ...(movie.alternativeTitles || [])].filter(Boolean))].slice(0, 4).map((t) => `"${t.replaceAll('"', '')}"`).join(" OR "),
    fq: 'section_name:("Movies" "Arts") AND type_of_material:("Review")',
    sort: "relevance",
    page: "0"
  });
  const data = await fetchJson(new URL(`?${params}`, root), "nyt", fetchImpl);
  if (data.status && data.status !== "OK") throw sourceError("nyt", 502);
  const matched = (data.response?.docs || [])
    .map((item) => ({ item, match: filmReviewIdentity(movie, item, "nyt") }))
    .find(({ match }) => match);
  if (!matched) return null;
  const { item: result, match } = matched;
  return {
    source: "nyt",
    label: SOURCE_LABELS.nyt,
    kind: "Critique",
    headline: plainText(result.headline?.main || result.headline?.print_headline, 180),
    summary: plainText(result.abstract || result.snippet || result.lead_paragraph, 220),
    byline: plainText(result.byline?.original, 100),
    publishedAt: result.pub_date || null,
    url: safeHttpsUrl(result.web_url, ["nytimes.com"]),
    rating: null,
    match
  };
}

export async function omdbReception(movie, key, options = {}) {
  const root = options.root || "https://www.omdbapi.com/";
  const fetchImpl = options.fetchImpl || fetch;
  const params = new URLSearchParams({ apikey: key, plot: "short", r: "json" });
  if (/^tt\d{5,12}$/.test(movie.imdbId || "")) params.set("i", movie.imdbId);
  else {
    params.set("t", queryTitle(movie));
    if (releaseYear(movie)) params.set("y", releaseYear(movie));
  }
  const data = await fetchJson(new URL(`?${params}`, root), "omdb", fetchImpl);
  if (data.Response === "False") {
    if (/not found/i.test(data.Error || "")) return null;
    throw sourceError("omdb", /limit|quota/i.test(data.Error || "") ? 429 : /key|activat/i.test(data.Error || "") ? 401 : 502);
  }
  if (!titleMatches(movie, data.Title || "") && !(movie.imdbId && data.imdbID === movie.imdbId)) return null;
  const ratings = (Array.isArray(data.Ratings) ? data.Ratings : [])
    .map(({ Source, Value }) => ({ source: plainText(Source, 60), value: plainText(Value, 30) }))
    .filter(({ source, value }) => source && value)
    .slice(0, 4);
  const imdbId = /^tt\d{5,12}$/.test(data.imdbID || "") ? data.imdbID : movie.imdbId;
  return {
    source: "omdb",
    label: SOURCE_LABELS.omdb,
    kind: "Réception agrégée",
    headline: ratings.length ? "Repères de réception" : "Métadonnées croisées",
    summary: plainText(data.Awards && data.Awards !== "N/A" ? data.Awards : "", 180),
    byline: null,
    publishedAt: null,
    url: imdbId ? `https://www.imdb.com/title/${imdbId}/` : null,
    rating: null,
    ratings,
    votes: Number(String(data.imdbVotes || "").replaceAll(",", "")) || 0,
    match: {
      certainty: movie.imdbId && data.imdbID === movie.imdbId ? "exact" : "probable",
      evidence: movie.imdbId && data.imdbID === movie.imdbId
        ? ["identifiant IMDb identique"]
        : ["titre et année compatibles"]
    }
  };
}

export function createExternalSourceClient(options = {}) {
  const roots = {
    guardian: options.guardianRoot,
    nyt: options.nytRoot,
    omdb: options.omdbRoot
  };
  const fetchImpl = options.fetchImpl || fetch;
  const cache = new Map();
  let guardianTail = Promise.resolve();
  let lastGuardianStart = 0;
  let nytTail = Promise.resolve();
  const now = options.now || Date.now;
  const sleep = options.sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  let nytStarts = [];
  let nytCooldownUntil = 0;

  function queuedNyt(task) {
    const current = nytTail.then(async () => {
      nytStarts = nytStarts.filter((at) => now() - at < 60_000);
      if (now() < nytCooldownUntil || nytStarts.length >= 5) throw sourceError("nyt", 429);
      const wait = nytStarts.length ? Math.max(0, 1_050 - (now() - nytStarts.at(-1))) : 0;
      if (wait) await sleep(wait);
      nytStarts.push(now());
      try {
        return await task();
      } catch (error) {
        if (error.status === 429) nytCooldownUntil = now() + Math.max(60_000, error.retryAfterMs || 0);
        throw error;
      }
    });
    nytTail = current.catch(() => {});
    return current;
  }

  function cached(source, movie, credential, task) {
    const key = `${source}:${roots[source] || "default"}:${credential}:${movie.imdbId || movie.id}:${movie.releaseDate || ""}:${movie.director || ""}:${JSON.stringify(movie.alternativeTitles || [])}`;
    if (cache.get(key)?.expiresAt > now()) return cache.get(key).promise;
    cache.delete(key);
    const promise = (async () => {
      const stored = await options.persistentCache?.get(key);
      if (stored) return stored.data;
      const data = await task();
      await options.persistentCache?.set(key, data, data ? 7 * 86400_000 : 86400_000).catch(() => {});
      return data;
    })().catch((error) => {
      cache.delete(key);
      throw error;
    });
    cache.set(key, { promise, expiresAt: now() + 86400_000 });
    // Bound live entries; disk entries retain their own expiry.
    if (cache.size > 500) cache.delete(cache.keys().next().value);
    return promise;
  }

  function queuedGuardian(task) {
    const current = guardianTail.then(async () => {
      const wait = Math.max(0, 1_050 - (Date.now() - lastGuardianStart));
      if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
      lastGuardianStart = Date.now();
      return task();
    });
    guardianTail = current.catch(() => {});
    return current;
  }

  const lookups = {
    guardian: (movie, key) => cached("guardian", movie, key, () => queuedGuardian(() => guardianReview(movie, key, { root: roots.guardian, fetchImpl }))),
    nyt: (movie, key) => cached("nyt", movie, key, () => queuedNyt(() => nytReview(movie, key, { root: roots.nyt, fetchImpl }))),
    omdb: (movie, key) => cached("omdb", movie, key, () => omdbReception(movie, key, { root: roots.omdb, fetchImpl }))
  };

  async function enrich(movies, keys) {
    const sourceIds = Object.keys(lookups).filter((source) => keys[source]);
    const coverage = Object.fromEntries(sourceIds.map((source) => [source, { queried: movies.length, matched: 0, failed: 0 }]));
    const enriched = movies.map((movie) => ({ ...movie, perspectives: [] }));
    await Promise.all(sourceIds.flatMap((source) => enriched.map(async (movie) => {
      try {
        const perspective = await lookups[source](movie, keys[source]);
        if (perspective) {
          movie.perspectives.push(perspective);
          if (source === "omdb") movie.imdbVotes = perspective.votes || 0;
          coverage[source].matched += 1;
        }
      } catch (error) {
        coverage[source].failed += 1;
        const failure = sourceFailure(error);
        coverage[source].errors ||= [];
        if (!coverage[source].errors.some(({ code }) => code === failure.code)) coverage[source].errors.push(failure);
      }
    })));
    for (const movie of enriched) movie.perspectives.sort((a, b) => sourceIds.indexOf(a.source) - sourceIds.indexOf(b.source));
    return { movies: enriched, coverage };
  }

  async function check(source, key) {
    if (source === "guardian") {
      return queuedGuardian(async () => {
        const params = new URLSearchParams({ "api-key": key, q: "film", "page-size": "1" });
        const data = await fetchJson(new URL(`?${params}`, roots.guardian || "https://content.guardianapis.com/search"), source, fetchImpl);
        if (data.response?.status !== "ok") throw sourceError(source, 502);
      });
    }
    if (source === "nyt") {
      return queuedNyt(async () => {
      const params = new URLSearchParams({ "api-key": key, q: "film", page: "0" });
      const data = await fetchJson(new URL(`?${params}`, roots.nyt || "https://api.nytimes.com/svc/search/v2/articlesearch.json"), source, fetchImpl);
      if (data.status && data.status !== "OK") throw sourceError(source, 502);
      });
    }
    if (source === "omdb") {
      const params = new URLSearchParams({ apikey: key, i: "tt0111161", r: "json" });
      const data = await fetchJson(new URL(`?${params}`, roots.omdb || "https://www.omdbapi.com/"), source, fetchImpl);
      if (data.Response === "False") throw sourceError(source, /limit|quota/i.test(data.Error || "") ? 429 : /key|activat/i.test(data.Error || "") ? 401 : 502);
    }
  }

  return { check, enrich };
}
