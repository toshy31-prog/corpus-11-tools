export const GENRES = Object.freeze([
  [28, "Action"],
  [12, "Aventure"],
  [16, "Animation"],
  [35, "Comédie"],
  [80, "Policier"],
  [99, "Documentaire"],
  [18, "Drame"],
  [10751, "Famille"],
  [14, "Fantastique"],
  [36, "Histoire"],
  [27, "Horreur"],
  [10402, "Musique"],
  [9648, "Mystère"],
  [10749, "Romance"],
  [878, "Science-fiction"],
  [53, "Thriller"],
  [10752, "Guerre"],
  [37, "Western"]
]);

export const LENSES = Object.freeze([
  {
    id: "hidden-gem",
    label: "Pépite cachée",
    description: "Bonne réception, mais peu de votes et de visibilité."
  },
  {
    id: "elsewhere",
    label: "Dépaysement",
    description: "Favorise les langues originales autres que français et anglais."
  },
  {
    id: "living-memory",
    label: "Mémoire vive",
    description: "Fait remonter les œuvres anciennes qui restent fortement reçues."
  },
  {
    id: "oblique",
    label: "Film oblique",
    description: "Cherche les mélanges de genres rares et les formes atypiques."
  }
]);

export const PROGRAM_ROLES = Object.freeze([
  {
    id: "match",
    label: "Le choix juste",
    description: "La proposition la plus proche de votre demande."
  },
  {
    id: "sidestep",
    label: "Le pas de côté",
    description: "Le même élan, déplacé vers une autre époque, langue ou forme."
  },
  {
    id: "gamble",
    label: "Le pari",
    description: "Une proposition moins évidente, mais défendue par vos angles de découverte."
  },
  {
    id: "counter",
    label: "Le contre-choix",
    description: "Le film qui résiste le mieux à la logique dominante du programme."
  }
]);

const PROGRAM_ROLES_BY_DETOUR = Object.freeze({
  faithful: [
    { id: "match", label: "Le choix juste", description: "La réponse la plus nette à votre demande." },
    { id: "near", label: "L’alternative proche", description: "La même promesse, avec une légère variation de ton." },
    { id: "safe", label: "La valeur sûre", description: "Une autre proposition solide dans le même couloir." },
    { id: "nuance", label: "La nuance", description: "Le bord de votre demande, sans changement de cap." }
  ],
  sidestep: PROGRAM_ROLES,
  adventurous: [
    { id: "anchor", label: "Le point d’ancrage", description: "Une proposition qui garde un lien clair avec votre demande." },
    { id: "elsewhere", label: "L’autre territoire", description: "Le plus grand déplacement de langue, d’époque ou de forme." },
    { id: "break", label: "La rupture", description: "Une seconde bifurcation, distincte des deux premières." },
    { id: "accident", label: "L’accident heureux", description: "Le choix le moins prévisible que le programme puisse défendre." }
  ]
});

const LENS_IDS = new Set(LENSES.map(({ id }) => id));
const EFFECTS = new Set(["open", "captivate", "contemplate", "comfort", "shake", "wonder"]);
const TIME_BUDGETS = new Set(["short", "standard", "ample"]);
const DETOURS = new Set(["faithful", "sidestep", "adventurous"]);

const GENRE_ALIASES = new Map([
  ["action", 28], ["aventure", 12], ["animation", 16],
  ["comédie", 35], ["comedie", 35], ["drôle", 35], ["drole", 35],
  ["policier", 80], ["crime", 80], ["documentaire", 99], ["docu", 99],
  ["drame", 18], ["famille", 10751], ["fantastique", 14],
  ["historique", 36], ["histoire", 36], ["horreur", 27],
  ["musical", 10402], ["musique", 10402], ["mystère", 9648], ["mystere", 9648],
  ["romance", 10749], ["romantique", 10749],
  ["science-fiction", 878], ["science fiction", 878], ["sci-fi", 878], ["sf", 878],
  ["thriller", 53], ["guerre", 10752], ["western", 37]
]);

const SORTS = new Set(["quality", "popular", "recent", "surprise"]);

const QUALITATIVE_PROFILES = Object.freeze([
  {
    id: "spectacle",
    label: "grand spectacle / effets visuels",
    pattern: /effets? sp[ée]ciaux|effets? visuels?|grand spectacle|spectaculaire|visuellement impressionnant/,
    genres: [28, 12, 14, 878],
    keywords: ["alien", "space", "spaceship", "superhero", "monster", "robot", "dystopia", "disaster", "epic", "future", "visual effects", "special effects"]
  },
  {
    id: "contemplative",
    label: "contemplatif",
    pattern: /contemplati|m[ée]ditati|slow cinema|film lent/,
    genres: [18, 99],
    keywords: ["meditation", "nature", "philosophy", "minimalism", "slow cinema", "solitude"]
  },
  {
    id: "dark",
    label: "sombre / intense",
    pattern: /sombre|intense|angoissant|oppressant|d[ée]rangeant/,
    genres: [27, 53, 80, 18],
    keywords: ["dark", "grief", "murder", "psychological", "nightmare", "crime"]
  },
  {
    id: "tense",
    label: "tension / suspense",
    pattern: /suspens|haletant|halletant|captivant|tendu|tenir en haleine/,
    genres: [53, 80, 9648, 28],
    keywords: ["suspense", "investigation", "mystery", "conspiracy", "chase", "hostage", "survival"]
  },
  {
    id: "light",
    label: "léger / réconfortant",
    pattern: /l[ée]ger|r[ée]confortant|feel[ -]?good|bonne humeur/,
    genres: [35, 10749, 10751],
    keywords: ["friendship", "feel-good", "romance", "family", "comedy"]
  },
  {
    id: "poetic",
    label: "poétique",
    pattern: /po[ée]tique|onirique|r[êe]veur/,
    genres: [18, 14],
    keywords: ["poetry", "dream", "surrealism", "magical realism", "memory"]
  }
]);

const EFFECT_PROFILES = Object.freeze({
  captivate: ["tense"],
  contemplate: ["contemplative"],
  comfort: ["light"],
  shake: ["dark"],
  wonder: ["poetic", "spectacle"]
});

function containsTerm(source, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, "u").test(source);
}

function boundedNumber(value, fallback, min, max) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

export function normalizeFilters(input = {}, nowYear = new Date().getFullYear()) {
  const minYear = Math.round(boundedNumber(input.minYear, 1900, 1874, nowYear));
  const maxYear = Math.round(boundedNumber(input.maxYear, nowYear, minYear, nowYear));
  const genres = [...new Set((Array.isArray(input.genres) ? input.genres : [])
    .map(Number)
    .filter((genre) => GENRES.some(([id]) => id === genre)))];
  const effect = EFFECTS.has(input.effect) ? input.effect : "open";
  const timeBudget = TIME_BUDGETS.has(input.timeBudget) ? input.timeBudget : "ample";
  const detour = DETOURS.has(input.detour) ? input.detour : "faithful";
  const lenses = [...new Set((Array.isArray(input.lenses) ? input.lenses : [])
    .filter((lens) => LENS_IDS.has(lens)))].slice(0, 2);
  const requestedRuntime = Math.round(boundedNumber(input.maxRuntime, 180, 40, 600));
  const timeLimit = { short: 90, standard: 120, ample: 180 }[timeBudget];

  return {
    country: "FR",
    provider: "MUBI",
    minYear,
    maxYear,
    minRating: boundedNumber(input.minRating, 6.8, 0, 10),
    minVotes: Math.round(boundedNumber(input.minVotes, 40, 0, 1000000)),
    maxRuntime: Math.min(requestedRuntime, timeLimit),
    genres,
    lenses,
    effect,
    timeBudget,
    detour,
    sort: SORTS.has(input.sort) ? input.sort : "quality",
    hideSeen: input.hideSeen !== false,
    seen: [...new Set((Array.isArray(input.seen) ? input.seen : []).map(Number).filter(Number.isInteger))]
  };
}

export function parseWish(text, filters, nowYear = new Date().getFullYear()) {
  if (!text?.trim()) return normalizeFilters(filters, nowYear);
  const source = text.toLocaleLowerCase("fr-FR");
  const next = { ...filters };

  const between = source.match(/entre\s+(\d{4})\s+(?:et|à|a)\s+(\d{4})/);
  const after = source.match(/(?:après|apres)\s+(\d{4})/);
  const since = source.match(/depuis\s+(\d{4})/);
  const before = source.match(/avant\s+(\d{4})/);
  if (between) {
    next.minYear = Math.min(Number(between[1]), Number(between[2]));
    next.maxYear = Math.max(Number(between[1]), Number(between[2]));
  } else {
    if (after) next.minYear = Number(after[1]) + 1;
    if (since) next.minYear = Number(since[1]);
    if (before) next.maxYear = Number(before[1]) - 1;
  }

  const rating = source.match(/(?:note|noté|notee|notée|au moins)\D{0,8}(\d(?:[.,]\d)?)/);
  if (rating) next.minRating = Number(rating[1].replace(",", "."));
  else if (/excellent|très bon|tres bon/.test(source)) next.minRating = 7.5;
  else if (/bien not[ée]/.test(source)) next.minRating = 7;

  const hours = source.match(/(?:moins de|max(?:imum)?|jusqu['’]?à)\s+(\d)\s*(?:heures?|h)(?:\s*(\d{1,2}))?/);
  const minutes = source.match(/(?:moins de|max(?:imum)?|jusqu['’]?à)\s+(\d{2,3})\s*(?:min|minutes)/);
  if (hours) next.maxRuntime = Number(hours[1]) * 60 + Number(hours[2] || 0);
  else if (minutes) next.maxRuntime = Number(minutes[1]);
  else if (/\btrès court\b|\btres court\b/.test(source)) next.maxRuntime = 90;
  else if (/\bcourt\b/.test(source)) next.maxRuntime = 105;

  if (/\br[ée]cent/.test(source) && !between && !after && !since) next.minYear = nowYear - 5;
  if (/\bclassique/.test(source)) next.maxYear = Math.min(Number(next.maxYear || nowYear), 1999);
  if (/\bsurprends|\bsurprise|\bau hasard/.test(source)) next.sort = "surprise";

  const detectedGenres = [];
  for (const [alias, id] of GENRE_ALIASES) {
    if (containsTerm(source, alias)) detectedGenres.push(id);
  }
  if (detectedGenres.length) next.genres = detectedGenres;

  return normalizeFilters(next, nowYear);
}

export function analyzeWish(text, filters, nowYear = new Date().getFullYear()) {
  const normalizedText = text?.trim() || "";
  const source = normalizedText.toLocaleLowerCase("fr-FR");
  const baseFilters = normalizeFilters(filters, nowYear);
  const parsedFilters = parseWish(normalizedText, baseFilters, nowYear);
  const textProfiles = QUALITATIVE_PROFILES
    .filter((profile) => profile.pattern.test(source))
    .map(({ id, label }) => ({ id, label }));
  const explicitProfileIds = EFFECT_PROFILES[parsedFilters.effect] || [];
  const explicitProfiles = explicitProfileIds.map((id) => {
    const profile = QUALITATIVE_PROFILES.find((candidate) => candidate.id === id);
    return { id: profile.id, label: profile.label };
  });
  const qualitative = [...new Map([...explicitProfiles, ...textProfiles].map((profile) => [profile.id, profile])).values()];
  const textChangedFilters = ["minYear", "maxYear", "minRating", "maxRuntime", "sort", "genres"]
    .some((key) => JSON.stringify(parsedFilters[key]) !== JSON.stringify(baseFilters[key]));
  const textUnderstood = textChangedFilters || textProfiles.length > 0;
  return {
    filters: parsedFilters,
    qualitative,
    notice: !normalizedText
      ? null
      : textUnderstood
        ? "La précision libre a ajouté des critères visibles ci-dessus. Les nuances marquées ≈ influencent le classement sans constituer une garantie."
        : "La précision libre n’a ajouté aucun critère reconnu ; le programme repose uniquement sur les choix affichés."
  };
}

export function buildDiscoverParams(filters, providerId, page = 1) {
  const sortBy = {
    quality: "vote_average.desc",
    popular: "popularity.desc",
    recent: "primary_release_date.desc",
    surprise: "popularity.desc"
  }[filters.sort];

  const params = new URLSearchParams({
    language: "fr-FR",
    region: "FR",
    watch_region: "FR",
    with_watch_providers: String(providerId),
    with_watch_monetization_types: "flatrate",
    include_adult: "false",
    include_video: "false",
    sort_by: sortBy,
    "primary_release_date.gte": `${filters.minYear}-01-01`,
    "primary_release_date.lte": `${filters.maxYear}-12-31`,
    "vote_average.gte": String(filters.minRating),
    "vote_count.gte": String(filters.minVotes),
    "with_runtime.lte": String(filters.maxRuntime),
    page: String(page)
  });
  if (filters.genres.length) params.set("with_genres", filters.genres.join("|"));
  return params;
}

export function explorationPageCount(filters) {
  return { faithful: 5, sidestep: 8, adventurous: 12 }[filters.detour] || 5;
}

export function buildExplorationPages(totalPages, filters, random = Math.random) {
  const available = Math.max(1, Math.min(500, Math.floor(Number(totalPages) || 1)));
  const target = Math.min(available, explorationPageCount(filters));
  if (filters.sort !== "surprise") return Array.from({ length: target }, (_, index) => index + 1);

  const pages = new Set([1]);
  const horizon = Math.min(available, 60);
  while (pages.size < target) pages.add(1 + Math.floor(random() * horizon));
  return [...pages];
}

export function pickResults(results, filters, limit = 12, random = Math.random) {
  const available = results.filter((movie) => !filters.hideSeen || !filters.seen.includes(movie.id));
  if (filters.sort !== "surprise") return available.slice(0, limit);
  return available
    .map((movie) => ({ movie, order: random() }))
    .sort((a, b) => a.order - b.order)
    .slice(0, limit)
    .map(({ movie }) => movie);
}

export function rankByQualitativePreferences(movies, qualitative = []) {
  if (!qualitative.length) return movies;
  const profileIds = new Set(qualitative.map(({ id }) => id));
  return movies
    .map((movie, index) => {
      const haystack = [movie.title, movie.originalTitle, movie.original_title, movie.overview, ...(movie.keywords || [])]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("fr-FR");
      let score = -index * 0.025;
      const reasons = [];
      for (const profile of QUALITATIVE_PROFILES) {
        if (!profileIds.has(profile.id)) continue;
        const genreHits = profile.genres.filter((genre) => movieGenres(movie).includes(genre)).length;
        const keywordHits = profile.keywords.filter((keyword) => haystack.includes(keyword)).length;
        const profileScore = genreHits * 3 + keywordHits * 2;
        score += profileScore;
        if (profileScore >= 3) reasons.push(`Élan · ${profile.label}`);
        if (profile.id === "spectacle") {
          score += Math.log10(Math.max(1, movie.popularity || 1)) * 0.7;
          score += Math.log10(Math.max(1, movie.budget || 1)) * 0.35;
        }
      }
      return {
        movie: reasons.length
          ? { ...movie, why: [...new Set([...(movie.why || []), ...reasons])].slice(0, 3) }
          : movie,
        score
      };
    })
    .sort((a, b) => b.score - a.score)
    .map(({ movie }) => movie);
}

function movieGenres(movie) {
  return movie.genreIds || movie.genre_ids || [];
}

function movieYear(movie) {
  const value = movie.releaseDate || movie.release_date || "";
  return Number(String(value).slice(0, 4)) || new Date().getFullYear();
}

function movieValue(movie, camel, snake = camel) {
  return Number(movie[camel] ?? movie[snake] ?? 0) || 0;
}

function normalizeValues(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (!Number.isFinite(min) || min === max) return values.map(() => 0.5);
  return values.map((value) => (value - min) / (max - min));
}

function stableNoise(id) {
  const value = Math.sin(Number(id) * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function distanceBetween(left, right) {
  const leftGenres = new Set(movieGenres(left));
  const rightGenres = new Set(movieGenres(right));
  const union = new Set([...leftGenres, ...rightGenres]);
  const common = [...leftGenres].filter((genre) => rightGenres.has(genre)).length;
  const genreDistance = union.size ? 1 - common / union.size : 0.5;
  const languageDistance = (left.originalLanguage || left.original_language) !== (right.originalLanguage || right.original_language) ? 1 : 0;
  const yearDistance = Math.min(1, Math.abs(movieYear(left) - movieYear(right)) / 35);
  return genreDistance * 0.5 + languageDistance * 0.25 + yearDistance * 0.25;
}

export function selectWithLenses(movies, filters, limit = 12) {
  const active = new Set(filters.lenses || []);
  if (!active.size) return movies.slice(0, limit).map((movie) => ({ ...movie, why: movie.why || [] }));

  const ratings = normalizeValues(movies.map((movie) => movieValue(movie, "rating", "vote_average")));
  const votes = normalizeValues(movies.map((movie) => Math.log10(1 + movieValue(movie, "votes", "vote_count"))));
  const popularities = normalizeValues(movies.map((movie) => Math.log10(1 + movieValue(movie, "popularity"))));
  const ages = normalizeValues(movies.map((movie) => Math.max(0, new Date().getFullYear() - movieYear(movie))));
  const genreFrequency = new Map();
  for (const movie of movies) {
    for (const genre of movieGenres(movie)) genreFrequency.set(genre, (genreFrequency.get(genre) || 0) + 1);
  }

  const scored = movies.map((movie, index) => {
    const lensScores = [];
    const genres = movieGenres(movie);
    const language = movie.originalLanguage || movie.original_language || "";
    const keywords = (movie.keywords || []).join(" ").toLocaleLowerCase("fr-FR");
    const base = movies.length > 1 ? 1 - index / (movies.length - 1) : 1;

    if (active.has("hidden-gem")) {
      lensScores.push(["Pépite cachée", ratings[index] * 0.55 + (1 - votes[index]) * 0.25 + (1 - popularities[index]) * 0.2]);
    }
    if (active.has("elsewhere")) {
      lensScores.push([`Dépaysement${language ? ` · ${language.toUpperCase()}` : ""}`, language && !["fr", "en"].includes(language) ? 1 : 0]);
    }
    if (active.has("living-memory")) {
      lensScores.push(["Mémoire vive", ages[index] * 0.7 + ratings[index] * 0.3]);
    }
    if (active.has("oblique")) {
      const rarity = genres.length
        ? genres.reduce((total, genre) => total + 1 / (genreFrequency.get(genre) || 1), 0) / genres.length
        : 0;
      const formSignal = /experimental|surrealis|avant-garde|absurd|dream|essay film|magical realism/.test(keywords) ? 1 : 0;
      lensScores.push(["Film oblique", Math.min(1, rarity * 1.8 + formSignal * 0.55 + (1 - popularities[index]) * 0.2)]);
    }
    const total = base * 0.7 + lensScores.reduce((sum, [, score]) => sum + score * 0.85, 0);
    const why = lensScores
      .filter(([, score]) => score >= 0.45)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 2)
      .map(([label]) => label);
    return { movie: { ...movie, why }, total };
  }).sort((left, right) => right.total - left.total);

  return scored.slice(0, limit).map(({ movie }) => movie);
}

function bestCandidateIndex(movies, score) {
  return movies.reduce((bestIndex, movie, index) => (
    score(movie, index) > score(movies[bestIndex], bestIndex) ? index : bestIndex
  ), 0);
}

export function buildProgramme(movies, filters = {}, limit = PROGRAM_ROLES.length) {
  if (typeof filters === "number") {
    limit = filters;
    filters = {};
  }
  const detour = DETOURS.has(filters.detour) ? filters.detour : "sidestep";
  const roles = PROGRAM_ROLES_BY_DETOUR[detour];
  const remaining = movies.map((movie, sourceIndex) => ({ ...movie, sourceIndex }));
  const selected = [];
  const take = (index, role) => {
    const [movie] = remaining.splice(index, 1);
    selected.push({
      ...movie,
      role: { ...role }
    });
  };

  if (!remaining.length || limit <= 0) return [];
  take(0, roles[0]);

  if (detour === "faithful") {
    while (remaining.length && selected.length < limit) take(0, roles[selected.length]);
    return selected.map(({ sourceIndex, ...movie }) => movie);
  }

  if (remaining.length && selected.length < limit) {
    const anchor = selected[0];
    const index = bestCandidateIndex(remaining, (movie) => {
      const rankValue = 1 - movie.sourceIndex / Math.max(1, movies.length - 1);
      const depthValue = 1 - rankValue;
      return detour === "adventurous"
        ? distanceBetween(anchor, movie) * 0.72 + depthValue * 0.28
        : distanceBetween(anchor, movie) * 0.45 + rankValue * 0.55;
    });
    take(index, roles[1]);
  }

  if (remaining.length && selected.length < limit) {
    const popularity = normalizeValues(remaining.map((movie) => Math.log10(1 + movieValue(movie, "popularity"))));
    const index = bestCandidateIndex(remaining, (movie, candidateIndex) => {
      const rankValue = 1 - movie.sourceIndex / Math.max(1, movies.length - 1);
      const discoverySignal = (movie.why || []).some((reason) => /Pépite|oblique|Dépaysement/.test(reason)) ? 1 : 0;
      if (detour === "adventurous") {
        const separation = Math.min(...selected.map((chosen) => distanceBetween(chosen, movie)));
        const depthValue = 1 - rankValue;
        return separation * 0.45 + depthValue * 0.27 + (1 - popularity[candidateIndex]) * 0.16 + stableNoise(movie.id) * 0.12;
      }
      const outsideHead = movie.sourceIndex >= Math.min(4, movies.length - 1) ? 1 : 0;
      return outsideHead * 0.38 + stableNoise(movie.id) * 0.14 + (1 - popularity[candidateIndex]) * 0.12 + discoverySignal * 0.16 + rankValue * 0.2;
    });
    take(index, roles[2]);
  }

  if (remaining.length && selected.length < limit) {
    const index = bestCandidateIndex(remaining, (movie) => {
      const rankValue = 1 - movie.sourceIndex / Math.max(1, movies.length - 1);
      const depthValue = 1 - rankValue;
      const averageDistance = selected.reduce((sum, chosen) => sum + distanceBetween(chosen, movie), 0) / selected.length;
      return detour === "adventurous"
        ? averageDistance * 0.4 + depthValue * 0.32 + stableNoise(movie.id) * 0.28
        : averageDistance * 0.5 + rankValue * 0.5;
    });
    take(index, roles[3]);
  }

  return selected.slice(0, Math.min(limit, roles.length)).map(({ sourceIndex, ...movie }) => movie);
}

export function describeFilters(filters) {
  const genreNames = filters.genres.map((id) => GENRES.find(([genreId]) => genreId === id)?.[1]).filter(Boolean);
  return [
    "MUBI France",
    `${filters.minYear}–${filters.maxYear}`,
    `note ≥ ${filters.minRating}`,
    `votes ≥ ${filters.minVotes}`,
    `≤ ${filters.maxRuntime} min`,
    ...(genreNames.length ? [genreNames.join(" ou ")] : []),
    filters.sort === "surprise" ? "ordre surprise" : null
  ].filter(Boolean);
}
