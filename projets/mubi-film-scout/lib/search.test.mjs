import test from "node:test";
import assert from "node:assert/strict";
import {
  LENSES,
  PROGRAM_ROLES,
  analyzeWish,
  buildProgramme,
  buildDiscoverParams,
  buildExplorationPages,
  describeFilters,
  explorationPageCount,
  normalizeFilters,
  parseWish,
  pickResults,
  rankByQualitativePreferences,
  selectWithLenses
} from "./search.mjs";

test("normalise et borne les filtres", () => {
  const filters = normalizeFilters({ minYear: 2020, maxYear: 2010, minRating: 12, genres: [18, 18, 999], lenses: ["hidden-gem", "unknown", "hidden-gem"] }, 2026);
  assert.equal(filters.country, "FR");
  assert.equal(filters.provider, "MUBI");
  assert.equal(filters.maxYear, 2020);
  assert.equal(filters.minRating, 10);
  assert.deepEqual(filters.genres, [18]);
  assert.deepEqual(filters.lenses, ["hidden-gem"]);
});

test("traduit les choix explicites de soirée en contraintes réelles", () => {
  const filters = normalizeFilters({
    effect: "captivate",
    timeBudget: "short",
    detour: "adventurous",
    maxRuntime: 180
  }, 2026);
  assert.equal(filters.effect, "captivate");
  assert.equal(filters.maxRuntime, 90);
  assert.deepEqual(filters.lenses, []);
});

test("comprend une envie rédigée en français", () => {
  const filters = parseWish(
    "Surprends-moi avec un thriller ou une science-fiction après 2014, note au moins 7, moins de 2h10",
    {},
    2026
  );
  assert.equal(filters.minYear, 2015);
  assert.equal(filters.minRating, 7);
  assert.equal(filters.maxRuntime, 130);
  assert.equal(filters.sort, "surprise");
  assert.deepEqual(filters.genres.sort((a, b) => a - b), [53, 878]);
});

test("compile les paramètres TMDB pour MUBI France", () => {
  const filters = normalizeFilters({ minYear: 2000, maxYear: 2020, genres: [18, 99], maxRuntime: 110 }, 2026);
  const params = buildDiscoverParams(filters, 11, 3);
  assert.equal(params.get("watch_region"), "FR");
  assert.equal(params.get("with_watch_providers"), "11");
  assert.equal(params.get("with_watch_monetization_types"), "flatrate");
  assert.equal(params.get("with_genres"), "18|99");
  assert.equal(params.get("with_runtime.lte"), "110");
  assert.equal(params.get("page"), "3");
});

test("élargit l’exploration selon la liberté accordée", () => {
  const faithful = normalizeFilters({ detour: "faithful" }, 2026);
  const sidestep = normalizeFilters({ detour: "sidestep" }, 2026);
  const adventurous = normalizeFilters({ detour: "adventurous" }, 2026);
  assert.equal(explorationPageCount(faithful), 5);
  assert.deepEqual(buildExplorationPages(20, faithful), [1, 2, 3, 4, 5]);
  assert.equal(buildExplorationPages(20, sidestep).length, 8);
  assert.deepEqual(buildExplorationPages(3, adventurous), [1, 2, 3]);
});

test("échantillonne plusieurs zones du catalogue en mode surprise", () => {
  const filters = normalizeFilters({ detour: "faithful", sort: "surprise" }, 2026);
  const values = [0.2, 0.4, 0.6, 0.8];
  let cursor = 0;
  const pages = buildExplorationPages(20, filters, () => values[cursor++]);
  assert.deepEqual(pages, [1, 5, 9, 13, 17]);
});

test("écarte les films déjà vus", () => {
  const filters = normalizeFilters({ seen: [2], hideSeen: true });
  const result = pickResults([{ id: 1 }, { id: 2 }, { id: 3 }], filters, 12);
  assert.deepEqual(result.map(({ id }) => id), [1, 3]);
});

test("respecte les limites de mots pour les alias courts", () => {
  assert.deepEqual(parseWish("une transformation humaine", {}, 2026).genres, []);
  assert.deepEqual(parseWish("un film SF", {}, 2026).genres, [878]);
});

test("comprend les durées écrites en toutes lettres", () => {
  assert.equal(parseWish("moins de 2 heures 10", {}, 2026).maxRuntime, 130);
});

test("inverse une période saisie à rebours et respecte avant et après", () => {
  const between = parseWish("entre 2020 et 1980", {}, 2026);
  assert.equal(between.minYear, 1980);
  assert.equal(between.maxYear, 2020);
  assert.equal(parseWish("après 2014", {}, 2026).minYear, 2015);
  assert.equal(parseWish("avant 2000", {}, 2026).maxYear, 1999);
});

test("rend explicite une préférence qualitative", () => {
  const analysis = analyzeWish("un très bon film avec des effets spéciaux énormes", {}, 2026);
  assert.equal(analysis.filters.minRating, 7.5);
  assert.deepEqual(analysis.qualitative, [{ id: "spectacle", label: "grand spectacle / effets visuels" }]);
  assert.match(analysis.notice, /critères visibles/);
  assert.deepEqual(analyzeWish("des problèmes énormes", {}, 2026).qualitative, []);
  assert.match(analyzeWish("des problèmes énormes", {}, 2026).notice, /aucun critère reconnu/);
});

test("relie l’effet choisi et le vocabulaire de suspense aux profils qualitatifs", () => {
  assert.deepEqual(
    analyzeWish("", { effect: "captivate" }, 2026).qualitative,
    [{ id: "tense", label: "tension / suspense" }]
  );
  assert.deepEqual(
    analyzeWish("un suspense halletant", { effect: "open" }, 2026).qualitative,
    [{ id: "tense", label: "tension / suspense" }]
  );
});

test("réordonne les résultats selon les préférences qualitatives", () => {
  const quietDrama = { id: 1, genreIds: [18], popularity: 1, budget: 0, keywords: [] };
  const spaceEpic = { id: 2, genreIds: [878, 28], popularity: 100, budget: 100000000, keywords: ["space", "visual effects"] };
  const ranked = rankByQualitativePreferences(
    [quietDrama, spaceEpic],
    [{ id: "spectacle", label: "grand spectacle / effets visuels" }]
  );
  assert.deepEqual(ranked.map(({ id }) => id), [2, 1]);
});

test("utilise les genres TMDB bruts dans la présélection qualitative", () => {
  const drama = { id: 1, genre_ids: [18], popularity: 20 };
  const thriller = { id: 2, genre_ids: [53], popularity: 10 };
  const ranked = rankByQualitativePreferences([drama, thriller], [{ id: "tense", label: "tension" }]);
  assert.deepEqual(ranked.map(({ id }) => id), [2, 1]);
});

test("cumule plusieurs lentilles sans produire de score visible", () => {
  const mainstream = { id: 1, rating: 7.6, votes: 5000, popularity: 100, runtime: 160, releaseDate: "2024-01-01", originalLanguage: "en", genreIds: [28] };
  const hidden = { id: 2, rating: 8, votes: 60, popularity: 2, runtime: 82, releaseDate: "1980-01-01", originalLanguage: "ka", genreIds: [18, 36] };
  const filters = normalizeFilters({ lenses: ["hidden-gem", "elsewhere", "oblique"] }, 2026);
  assert.deepEqual(filters.lenses, ["hidden-gem", "elsewhere"]);
  const selected = selectWithLenses([mainstream, hidden], filters, 2);
  assert.equal(selected[0].id, 2);
  assert.ok(selected[0].why.includes("Pépite cachée"));
  assert.ok(selected[0].why.some((reason) => reason.startsWith("Dépaysement")));
  assert.equal("score" in selected[0], false);
});

test("ne présente pas un film francophone ou anglophone comme dépaysement", () => {
  const movies = [
    { id: 1, releaseDate: "2020-01-01", originalLanguage: "fr", genreIds: [18] },
    { id: 2, releaseDate: "2020-01-01", originalLanguage: "en", genreIds: [18] },
    { id: 3, releaseDate: "2020-01-01", originalLanguage: "ja", genreIds: [18] }
  ];
  const selected = selectWithLenses(movies, normalizeFilters({ lenses: ["elsewhere"] }, 2026), 3);
  const reasons = new Map(selected.map((movie) => [movie.originalLanguage, movie.why]));
  assert.deepEqual(reasons.get("fr"), []);
  assert.deepEqual(reasons.get("en"), []);
  assert.ok(reasons.get("ja").includes("Dépaysement · JA"));
});

test("le niveau de détour change réellement la composition et ses rôles", () => {
  const movies = [
    { id: 1, rating: 8, releaseDate: "2024-01-01", originalLanguage: "fr", genreIds: [18], popularity: 90 },
    { id: 2, rating: 7.9, releaseDate: "2023-01-01", originalLanguage: "fr", genreIds: [18], popularity: 80 },
    { id: 3, rating: 7.8, releaseDate: "2022-01-01", originalLanguage: "fr", genreIds: [18], popularity: 70 },
    { id: 4, rating: 7.8, releaseDate: "2021-01-01", originalLanguage: "en", genreIds: [18], popularity: 60 },
    { id: 5, rating: 7.7, releaseDate: "1950-01-01", originalLanguage: "ja", genreIds: [878], popularity: 8 },
    { id: 6, rating: 7.6, releaseDate: "1980-01-01", originalLanguage: "ka", genreIds: [99], popularity: 2 }
  ];
  const faithful = buildProgramme(movies, { detour: "faithful" });
  const adventurous = buildProgramme(movies, { detour: "adventurous" });
  assert.deepEqual(faithful.map(({ id }) => id), [1, 2, 3, 4]);
  assert.notDeepEqual(adventurous.map(({ id }) => id), faithful.map(({ id }) => id));
  assert.deepEqual(adventurous.map(({ role }) => role.id), ["anchor", "elsewhere", "break", "accident"]);
});

test("ne publie que quatre lentilles indépendantes et en borne le cumul", () => {
  assert.equal(LENSES.length, 4);
  assert.equal(new Set(LENSES.map(({ id }) => id)).size, LENSES.length);
  assert.deepEqual(
    normalizeFilters({ lenses: LENSES.map(({ id }) => id) }, 2026).lenses,
    ["hidden-gem", "elsewhere"]
  );
});

test("les six effets conduisent à six têtes de sélection distinctes", () => {
  const movies = [
    { id: 1, genreIds: [37], title: "Libre", keywords: [] },
    { id: 2, genreIds: [53, 9648], title: "Tension", keywords: ["investigation", "hostage"] },
    { id: 3, genreIds: [99, 18], title: "Silence", keywords: ["meditation", "nature"] },
    { id: 4, genreIds: [35, 10751], title: "Chaleur", keywords: ["friendship", "feel-good"] },
    { id: 5, genreIds: [27, 18], title: "Nuit", keywords: ["grief", "nightmare"] },
    { id: 6, genreIds: [14, 878], title: "Songe spatial", keywords: ["dream", "space", "visual effects"], popularity: 90, budget: 90000000 }
  ];
  const heads = ["open", "captivate", "contemplate", "comfort", "shake", "wonder"].map((effect) => {
    const qualitative = analyzeWish("", { effect }, 2026).qualitative;
    return rankByQualitativePreferences(movies, qualitative)[0].id;
  });
  assert.deepEqual(heads, [1, 2, 3, 4, 5, 6]);
});

test("exécute la matrice complète des réglages jouables", () => {
  const effects = ["open", "captivate", "contemplate", "comfort", "shake", "wonder"];
  const times = ["short", "standard", "ample"];
  const detours = ["faithful", "sidestep", "adventurous"];
  const lensIds = LENSES.map(({ id }) => id);
  const lensSets = [[], ...lensIds.map((id) => [id])];
  for (let left = 0; left < lensIds.length; left += 1) {
    for (let right = left + 1; right < lensIds.length; right += 1) lensSets.push([lensIds[left], lensIds[right]]);
  }
  const movies = Array.from({ length: 18 }, (_, index) => ({
    id: index + 1,
    title: `Film ${index + 1}`,
    rating: 6.9 + (index % 8) / 10,
    votes: 45 + index * 21,
    popularity: 2 + index * 4,
    runtime: 70 + (index % 6) * 20,
    releaseDate: `${1950 + index * 4}-01-01`,
    originalLanguage: ["fr", "en", "ja", "ka", "es", "ko"][index % 6],
    genreIds: [[53, 9648], [99, 18], [35, 10751], [27, 18], [14, 878], [37]][index % 6],
    keywords: [["suspense"], ["meditation"], ["friendship"], ["nightmare"], ["dream", "space"], []][index % 6]
  }));
  let combinations = 0;
  for (const effect of effects) for (const timeBudget of times) for (const detour of detours) for (const lenses of lensSets) {
    const filters = normalizeFilters({ effect, timeBudget, detour, lenses }, 2026);
    const eligible = movies.filter((movie) => movie.runtime <= filters.maxRuntime);
    const qualitative = analyzeWish("", filters, 2026).qualitative;
    const ranked = rankByQualitativePreferences(eligible, qualitative);
    const selected = selectWithLenses(ranked, filters, 12);
    const programme = buildProgramme(selected, filters);
    assert.equal(programme.length, 4);
    assert.equal(new Set(programme.map(({ id }) => id)).size, 4);
    combinations += 1;
  }
  assert.equal(combinations, 594);
});

test("compose quatre positions éditoriales distinctes", () => {
  const movies = [
    { id: 1, releaseDate: "2024-01-01", originalLanguage: "fr", genreIds: [18], popularity: 90 },
    { id: 2, releaseDate: "2023-01-01", originalLanguage: "fr", genreIds: [18], popularity: 80 },
    { id: 3, releaseDate: "1954-01-01", originalLanguage: "ja", genreIds: [878], popularity: 40, why: ["Film oblique"] },
    { id: 4, releaseDate: "1980-01-01", originalLanguage: "ka", genreIds: [99], popularity: 2, why: ["Pépite cachée"] },
    { id: 5, releaseDate: "2001-01-01", originalLanguage: "en", genreIds: [35], popularity: 20 }
  ];
  const programme = buildProgramme(movies);
  assert.equal(programme.length, 4);
  assert.equal(programme[0].id, 1);
  assert.deepEqual(programme.map(({ role }) => role.id), PROGRAM_ROLES.map(({ id }) => id));
  assert.equal(new Set(programme.map(({ id }) => id)).size, 4);
  assert.equal("sourceIndex" in programme[0], false);
});

test("compose un programme partiel quand le catalogue est trop court", () => {
  const programme = buildProgramme([{ id: 1 }, { id: 2 }]);
  assert.deepEqual(programme.map(({ role }) => role.id), ["match", "sidestep"]);
});

test("décrit les contraintes réellement appliquées", () => {
  const filters = normalizeFilters({ minYear: 1980, maxYear: 1999, minRating: 7.2, maxRuntime: 120, genres: [18] }, 2026);
  assert.deepEqual(describeFilters(filters), ["MUBI France", "1980–1999", "note ≥ 7.2", "votes ≥ 40", "≤ 120 min", "Drame"]);
});
