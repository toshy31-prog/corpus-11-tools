// Shared, deterministic discovery tools. Rankings are selection heuristics, not ratings.
export const ANGLES = Object.freeze([
  { id: "closed", label: "Huis clos", words: ["single location", "confined", "locked room"] },
  { id: "fragmented", label: "Récit fragmenté", words: ["nonlinear timeline", "nonlinear narrative", "non-linear"] },
  { id: "ensemble", label: "Film choral", words: ["ensemble cast", "multiple storylines"] },
  { id: "hybrid", label: "Documentaire hybride", words: ["docufiction", "mockumentary", "animated documentary"] },
  { id: "city", label: "Ville-personnage", words: ["city symphony", "urban life"] }
]);
const ids = (value) => [...new Set((Array.isArray(value) ? value : []).map(Number).filter((n) => Number.isSafeInteger(n) && n > 0))];
const text = (value, max = 300) => typeof value === "string" ? value.trim().slice(0, max) : "";
const array = (value) => Array.isArray(value) ? value : [];
const number = (value, max = Number.MAX_SAFE_INTEGER) => Number.isFinite(Number(value)) && Number(value) >= 0 ? Math.min(max, Number(value)) : 0;
const strings = (value, max = 300) => array(value).filter((v) => typeof v === "string").map((v) => text(v, max));
const date = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value) && Number.isFinite(Date.parse(value)) ? value : "";

// Closed schema: imported metadata is untrusted, including nested fields.
export function sanitizeMovie(m) {
  if (!m || typeof m !== "object" || !ids([m.id]).length) return null;
  return {
    id: Number(m.id), title: text(m.title) || "Sans titre", originalTitle: text(m.originalTitle),
    overview: text(m.overview, 10000), releaseDate: date(m.releaseDate).slice(0, 10),
    runtime: number(m.runtime, 6000), rating: number(m.rating, 10), votes: Math.floor(number(m.votes)),
    popularity: number(m.popularity), budget: number(m.budget), imdbVotes: number(m.imdbVotes),
    genreIds: ids(m.genreIds), collectionId: ids([m.collectionId])[0] || null,
    originalLanguage: /^[a-z]{2,3}$/.test(m.originalLanguage) ? m.originalLanguage : "",
    poster: safeLink(m.poster), offerLink: safeLink(m.offerLink),
    verified: m.verified === true && m.availability?.available !== false,
    checkedAt: date(m.checkedAt) || null,
    availability: { country: "FR", provider: "MUBI", type: "subscription", available: m.verified === true && m.availability?.available !== false, source: "TMDB / JustWatch" },
    audioLanguages: null, subtitles: null, director: text(m.director),
    imdbId: /^tt\d{5,12}$/.test(m.imdbId) ? m.imdbId : null,
    keywords: strings(m.keywords), why: strings(m.why), alternativeTitles: strings(m.alternativeTitles), productionCountries: strings(m.productionCountries, 3),
    cast: array(m.cast).filter(Boolean).slice(0, 20).map((c) => ({ name: text(c.name), character: text(c.character) })),
    perspectives: array(m.perspectives).filter(Boolean).slice(0, 10).map((p) => ({
      ...Object.fromEntries(["source", "label", "headline", "kind", "byline", "rating"].map((k) => [k, text(p[k])])),
      url: safeLink(p.url), summary: text(p.summary, 3000), publishedAt: date(p.publishedAt),
      match: { certainty: p.match?.certainty === "exact" ? "exact" : "probable", evidence: strings(p.match?.evidence) },
      ratings: array(p.ratings).filter(Boolean).map((r) => ({ source: text(r.source), value: text(r.value, 40) }))
    })),
    ...(typeof m.liked === "boolean" ? { liked: m.liked, at: date(m.at) } : {})
  };
}
export function safeLink(value) {
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? url.href : ""; } catch { return ""; }
}
export function normalizeCollection(input) {
  if (!input || !Array.isArray(input.films) || input.films.length > 5000) throw new Error("Collection attendue : nom et films (maximum 5 000). Identifiants TMDB obligatoires.");
  const films = input.films.map((film) => {
    const id = ids([typeof film === "number" ? film : film?.id])[0];
    if (!id) throw new Error("Chaque film doit avoir un identifiant TMDB entier positif.");
    return { id, title: text(film.title), note: text(film.note, 1000), source: safeLink(film.source), angles: array(film.angles).filter((id) => ANGLES.some((a) => a.id === id)), order: number(film.order) };
  });
  return { name: text(input.name, 100) || "Collection importée", source: safeLink(input.source), films: [...new Map(films.map((film) => [film.id, film])).values()] };
}
export function sanitizePreferences(input = {}) {
  const p = input && typeof input === "object" ? input : {};
  const movies = (value) => array(value).map(sanitizeMovie).filter(Boolean);
  const collections = [];
  for (const c of Array.isArray(p.collections) ? p.collections : []) { try { collections.push(normalizeCollection(c)); } catch { /* Reject malformed collections, preserve valid ones. */ } }
  return {
    seen: ids(p.seen), dismissed: ids(p.dismissed), compare: ids(p.compare).slice(0, 4),
    shortlist: [...new Map(movies(p.shortlist).map((m) => [m.id, m])).values()],
    history: movies(p.history).filter((m) => typeof m.liked === "boolean"),
    evaluations: array(p.evaluations).filter((v) => v && typeof v === "object").slice(-100).map((v) => ({ at: date(v.at), value: text(v.value), wish: text(v.wish, 2000), programmeIds: ids(v.programmeIds), filters: sanitizeForm(v.filters) })),
    rejections: array(p.rejections).filter((v) => v && ids([v.id]).length).slice(-500).map((v) => ({ id: Number(v.id), reason: text(v.reason), at: date(v.at), scope: "session" })),
    lists: Object.fromEntries(Object.entries(p.lists && typeof p.lists === "object" ? p.lists : {}).filter(([key]) => ids([key]).length).map(([key, value]) => [key, text(value, 80)])),
    collections,
    profile: { preferredGenres: ids(p.profile?.preferredGenres), excludedGenres: ids(p.profile?.excludedGenres) },
    form: p.form && typeof p.form === "object" ? sanitizeForm(p.form) : undefined
  };
}
function sanitizeForm(f = {}) {
  if (!f || typeof f !== "object") f = {};
  return { wish: text(f.wish, 2000), genres: ids(f.genres), lenses: strings(f.lenses).slice(0, 2), seen: ids(f.seen), hideSeen: f.hideSeen !== false,
    ...Object.fromEntries(["minYear", "maxYear", "minRating", "minVotes", "maxRuntime"].filter((k) => f[k] != null && f[k] !== "" && Number.isFinite(Number(f[k]))).map((k) => [k, number(f[k])])),
    ...Object.fromEntries(["effect", "timeBudget", "detour", "sort"].filter((k) => typeof f[k] === "string").map((k) => [k, text(f[k], 30)])) };
}
export function filmAngles(movie, collections = []) {
  const result = [];
  for (const collection of collections) {
    const annotation = collection.films?.find((film) => film.id === movie.id);
    if (!annotation?.note || !(annotation.source || collection.source)) continue;
    for (const id of annotation.angles || []) result.push({ id, label: ANGLES.find((a) => a.id === id)?.label, evidence: annotation.note, source: annotation.source || collection.source, kind: "Annotation éditoriale importée" });
  }
  for (const angle of ANGLES) {
    const match = (movie.keywords || []).find((word) => angle.words.includes(word.toLowerCase()));
    if (match && !result.some((a) => a.id === angle.id)) result.push({ id: angle.id, label: angle.label, evidence: `Mot-clé TMDB : ${match} ; indice, pas une garantie.`, source: `https://www.themoviedb.org/movie/${movie.id}`, kind: "Indice documentaire" });
  }
  return result;
}
export function differences(anchor, movie) {
  if (!anchor) return [];
  const result = [];
  if (anchor.originalLanguage && movie.originalLanguage && anchor.originalLanguage !== movie.originalLanguage) result.push(`langue originale ${movie.originalLanguage.toUpperCase()} au lieu de ${anchor.originalLanguage.toUpperCase()}`);
  const years = Number(movie.releaseDate?.slice(0, 4)) - Number(anchor.releaseDate?.slice(0, 4));
  if (anchor.releaseDate && movie.releaseDate && Math.abs(years) >= 10) result.push(`${Math.abs(years)} ans ${years > 0 ? "plus récent" : "plus ancien"}`);
  if (anchor.genreIds?.length && movie.genreIds?.length && !movie.genreIds.some((id) => anchor.genreIds.includes(id))) result.push("aucun genre principal commun");
  if (anchor.runtime && movie.runtime && Math.abs(anchor.runtime - movie.runtime) >= 20) result.push(`${Math.abs(movie.runtime - anchor.runtime)} minutes ${movie.runtime < anchor.runtime ? "plus court" : "plus long"}`);
  if (anchor.director && movie.director && anchor.director !== movie.director) result.push(`autre cinéaste : ${movie.director}`);
  return result;
}
export function eligible(movie, filters = {}, profile = {}) {
  const year = Number(movie.releaseDate?.slice(0, 4));
  return movie.verified === true && movie.availability?.available !== false
    && (filters.maxRuntime == null || (Number.isFinite(filters.maxRuntime) && filters.maxRuntime > 0 && movie.runtime > 0 && movie.runtime <= filters.maxRuntime))
    && (!filters.minYear || year >= filters.minYear) && (!filters.maxYear || year <= filters.maxYear)
    && (!filters.minRating || movie.rating >= filters.minRating)
    && (!filters.minVotes || movie.votes >= filters.minVotes)
    && (!filters.genres?.length || movie.genreIds?.some((id) => filters.genres.includes(id)))
    && (!filters.hideSeen || !filters.seen?.includes(movie.id))
    && !profile.excludedIds?.includes(movie.id)
    && !movie.genreIds?.some((id) => profile.excludedGenres?.includes(id))
    && (profile.maxRuntime == null || (Number.isFinite(profile.maxRuntime) && profile.maxRuntime > 0 && movie.runtime > 0 && movie.runtime <= profile.maxRuntime));
}
export function recompose(pool, { filters = {}, locked = [], excluded = [], previous = [], profile = {}, detour = "sidestep" } = {}) {
  const available = [...new Map(pool.filter((m) => eligible(m, filters, profile) && !excluded.includes(m.id)).map((m) => [m.id, m])).values()];
  const chosen = [...new Set(locked)].map((id) => available.find((m) => m.id === id)).filter(Boolean).slice(0, 4);
  const previousIds = new Set(previous);
  while (chosen.length < 4) {
    const candidates = available.filter((m) => !chosen.some((c) => tooSimilar(c, m)))
      .filter((m) => intentEvidence(m, filters.effect).length || (detour !== "faithful" && chosen.length === 3));
    if (!candidates.length) break;
    candidates.sort((a, b) => {
      const value = (m) => (previousIds.has(m.id) ? -100 : 0) + (m.genreIds?.some((id) => profile.preferredGenres?.includes(id)) ? 5 : 0) + (detour === "faithful" || !chosen.length ? 0 : Math.min(...chosen.map((c) => differences(c, m).length)) * 10) - (chosen.some((c) => lexicalSimilarity(c, m)) ? 30 : 0) - available.indexOf(m) / Math.max(1, available.length);
      return value(b) - value(a);
    });
    chosen.push(candidates[0]);
  }
  return describeProgramme(chosen, filters);
}
export function describeProgramme(chosen, filters = {}) {
  return explainProgramme(chosen).map((movie, i) => {
    const evidence = intentEvidence(movie, filters.effect);
    const departure = filters.effect && filters.effect !== "open" && !evidence.length;
    return { ...movie, role: { id: i ? `pick-${i}` : "match", label: departure ? "Hors de votre envie" : ["Au plus près de votre envie", "Une autre piste", "Une variation", "Un détour"][i], description: departure ? `Un détour assumé : aucun indice direct pour l’ambiance demandée. ${movie.role.description}` : `${evidence.join(" · ")}. ${i ? movie.role.description : "Ces repères orientent le choix, sans garantir votre ressenti."}` } };
  });
}
export function replaceProgrammeSlot(pool, current, id, options = {}) {
  const index = current.findIndex((m) => m.id === id);
  if (index < 0) return current;
  const { filters = {}, profile = {}, excluded = [], detour = "sidestep" } = options;
  const others = current.filter((m) => m.id !== id);
  const candidates = pool.filter((m) => m.id !== id && eligible(m, filters, profile) && !excluded.includes(m.id)
    && !others.some((c) => tooSimilar(c, m)) && (intentEvidence(m, filters.effect).length || (index === 3 && detour !== "faithful")));
  const replacement = recompose(candidates, { ...options, filters: { ...filters, effect: "open" } })[0];
  const next = current.map((m) => m.id === id ? replacement || (eligible(m, filters, profile) && !excluded.includes(id) ? m : null) : m).filter(Boolean);
  return describeProgramme(next, filters);
}
export function intentEvidence(movie, effect = "open") {
  if (effect === "open") return ["Sans ambiance imposée"];
  const profiles = {
    captivate: [[53, "Thriller"], [80, "Policier"], [9648, "Mystère"]],
    contemplate: [[99, "Documentaire"], [18, "Drame"]],
    comfort: [[35, "Comédie"], [10749, "Romance"], [10751, "Famille"]],
    shake: [[27, "Horreur"], [53, "Thriller"], [80, "Policier"]],
    wonder: [[14, "Fantastique"], [16, "Animation"], [878, "Science-fiction"]]
  };
  const primaryGenres = (movie.genreIds || movie.genre_ids || []).slice(0, 3);
  const words = { captivate: ["suspense", "hostage", "investigation", "psychological thriller"], contemplate: ["slow cinema", "meditation", "minimalism"], comfort: ["feel-good", "friendship"], shake: ["psychological horror", "disturbing", "nightmare"], wonder: ["poetry", "surrealism", "dream", "magical realism"] };
  return [...(profiles[effect] || []).filter(([id]) => primaryGenres.includes(id)).map(([, label]) => `Genre principal TMDB : ${label}`), ...(movie.keywords || []).filter((word) => words[effect]?.includes(word.toLowerCase())).map((word) => `Mot-clé TMDB : ${word}`)].slice(0, 3);
}
export function prioritizeIntent(movies, effect) {
  return [...movies].sort((a, b) => Number(Boolean(intentEvidence(b, effect).length)) - Number(Boolean(intentEvidence(a, effect).length)));
}
export function tooSimilar(a, b) {
  return a.id === b.id || Boolean(a.collectionId && a.collectionId === b.collectionId);
}
function lexicalSimilarity(a, b) {
  const tokens = (m) => String(m.originalTitle || m.title || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 5 && !["about", "their", "there", "movie", "reference", "night", "story"].includes(t));
  const heads = (m) => [...new Set([tokens(m)[0], tokens({ title: m.title })[0]].filter(Boolean))];
  return heads(a).some((head) => heads(b).includes(head)) && (a.genreIds || []).some((id) => b.genreIds?.includes(id));
}
export function explainProgramme(movies) {
  return movies.map((m, index) => {
    const diff = differences(movies[0], m);
    const description = index === 0 ? `${m.director || "Cinéaste non renseigné"} · ${m.runtime || "?"} min ; premier film dans l’ordre de sélection.`
      : diff.length ? `Par rapport à ${movies[0].title} : ${diff.slice(0, 2).join(" ; ")}.` : "Profil proche du premier film ; pas de contraste documenté sur les axes comparés.";
    return { ...m, role: { id: m.role?.id || `pick-${index}`, label: m.role?.label || ["Point d’ancrage", "Autre piste", "Le détour", "Le contraste"][index], description } };
  });
}
export function relatedMovies(anchor, pool, aspect, collections = []) {
  const matches = (m) => {
    if (aspect === "director") return anchor.director && m.director === anchor.director ? [anchor.director] : [];
    if (aspect === "era") return anchor.releaseDate && m.releaseDate && Math.abs(Number(anchor.releaseDate.slice(0, 4)) - Number(m.releaseDate.slice(0, 4))) <= 5 ? ["sorties à cinq ans d’intervalle au plus"] : [];
    if (aspect === "form") return filmAngles(anchor, collections).filter((a) => filmAngles(m, collections).some((b) => b.id === a.id)).map((a) => a.label);
    if (aspect === "reception") return receptionContrast(anchor).contrasted && receptionContrast(m).contrasted ? ["réceptions contrastées documentées"] : [];
    return (anchor.keywords || []).filter((k) => (m.keywords || []).includes(k));
  };
  return pool.filter((m) => m.id !== anchor.id).map((m) => ({ ...m, relationship: matches(m) })).filter((m) => m.relationship.length).sort((a, b) => b.relationship.length - a.relationship.length || a.id - b.id);
}
export function receptionContrast(movie) {
  const ratings = (movie.perspectives || []).flatMap((p) => p.ratings || []);
  const imdb = ratings.find((r) => /Internet Movie Database|IMDb/i.test(r.source));
  const meta = ratings.find((r) => /Metacritic/i.test(r.source));
  // RT approval percentage is NOT comparable to a mean rating.
  const audience = imdb && /^\d+(\.\d+)?\/10$/.test(imdb.value) ? parseFloat(imdb.value) : null;
  const critics = meta && /^\d+\/100$/.test(meta.value) ? parseFloat(meta.value) : null;
  const enough = Number(movie.imdbVotes) >= 1000;
  const contrasted = enough && audience !== null && critics !== null && ((audience >= 7 && critics <= 50) || (audience <= 5 && critics >= 70));
  return { contrasted, covered: enough && audience !== null && critics !== null, explanation: contrasted ? `Public IMDb ${imdb.value} (${movie.imdbVotes} votes), presse Metacritic ${meta.value} : orientations opposées selon nos seuils explicites. Aucun score moyen calculé.` : "Pas de contraste établi : il faut ≥ 1 000 votes IMDb et des appréciations opposées (IMDb ≥ 7 / presse ≤ 50, ou IMDb ≤ 5 / presse ≥ 70). RT reste séparé." };
}
export function doubleFeature(pool, budget = 240, mode = "contrast") {
  if (!validBudget(budget, 90, 900)) return null;
  const available = pool.filter((m) => eligible(m, { maxRuntime: budget }) && m.runtime > 0);
  let best = null;
  for (let i = 0; i < available.length; i++) for (let j = i + 1; j < available.length; j++) {
    const [a, b] = [available[i], available[j]];
    const total = a.runtime + b.runtime + 10;
    if (total > budget) continue;
    const diff = differences(a, b);
    const common = (a.keywords || []).filter((k) => (b.keywords || []).includes(k));
    if (mode === "echo" && !common.length && !(a.director && a.director === b.director)) continue;
    const value = mode === "echo" ? common.length + (a.director === b.director ? 2 : 0) : diff.length;
    if (!best || value > best.value) best = { films: [a, b], total, value, reason: mode === "echo" ? common.join(", ") || `Même cinéaste : ${a.director}` : diff.join(" ; ") || "Deux films sans contraste documenté", interval: 10 };
  }
  return best;
}
export function chooseTogether(pool, a, b, budget = 180) {
  if (!validBudget(budget, 40, 600)) return [];
  return pool.filter((m) => eligible(m, { maxRuntime: budget }, a) && eligible(m, { maxRuntime: budget }, b)).map((m) => {
    const likes = (person) => m.genreIds?.some((id) => person.preferredGenres?.includes(id));
    const support = Number(Boolean(likes(a))) + Number(Boolean(likes(b)));
    return { ...m, support, compromise: `${likes(a) ? "Genre souhaité par A" : "Veto A respecté, sans préférence reconnue"} ; ${likes(b) ? "genre souhaité par B" : "veto B respecté, sans préférence reconnue"}.` };
  }).sort((a, b) => b.support - a.support || a.id - b.id);
}
export function validBudget(value, min = 40, max = 600) { return Number.isFinite(value) && value >= min && value <= max; }
export function itinerary(pool, collection) {
  return [...collection.films].sort((a, b) => a.order - b.order).map((f) => {
    const movie = pool.find((m) => m.id === f.id && eligible(m));
    return movie ? { ...movie, relationship: [f.note || `Étape de la collection « ${collection.name} »`] } : null;
  }).filter(Boolean).slice(0, 3);
}
export function profileHypotheses(history) {
  const counts = new Map();
  for (const m of history.filter((m) => m.liked === true)) for (const id of m.genreIds || []) counts.set(id, (counts.get(id) || 0) + 1);
  return [...counts].filter(([, n]) => n >= 3).map(([id, count]) => ({ id, count, label: `${count} films explicitement aimés partagent ce genre. Le privilégier ?` }));
}
