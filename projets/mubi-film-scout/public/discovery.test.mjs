import test from "node:test";
import assert from "node:assert/strict";
import { ANGLES, normalizeCollection, sanitizePreferences, sanitizeMovie, replaceProgrammeSlot, filmAngles, eligible, recompose, explainProgramme, relatedMovies, receptionContrast, doubleFeature, chooseTogether, itinerary, profileHypotheses, tooSimilar, intentEvidence } from "./discovery.mjs";
const movie = (id, extra = {}) => ({ id, title: `Film ${id}`, verified: true, runtime: 90, rating: 7.4, votes: 100, releaseDate: "2000-01-01", genreIds: [18], originalLanguage: "fr", director: "Auteur A", keywords: ["memory"], ...extra });
const pool = Array.from({ length: 12 }, (_, i) => movie(i + 1, { originalLanguage: ["fr", "en", "fa"][i % 3], releaseDate: `${1970 + i * 4}-01-01`, runtime: 80 + i * 3 }));

test("import fermé : aucun champ mal typé ni métadonnée HTML exécutable", () => {
  const cleaned = sanitizeMovie({ id: 1, title: {}, releaseDate: 99, runtime: '<img class="audit-injection">', keywords: {}, cast: [null, {name: {}}], perspectives: [{ ratings: {}, match: { evidence: {} } }], unexpected: "ignored", verified: true, availability: { available: false } });
  assert.equal(cleaned.runtime, 0); assert.equal(cleaned.releaseDate, ""); assert.equal(cleaned.title, "Sans titre");
  assert.equal(cleaned.verified, false); assert.equal(cleaned.unexpected, undefined);
  assert.deepEqual(cleaned.keywords, []); assert.deepEqual(cleaned.perspectives[0].ratings, []);
  assert.doesNotThrow(() => filmAngles(cleaned));
  assert.doesNotThrow(() => sanitizePreferences({ shortlist: [null, cleaned], form: { lenses: {}, genres: false }, collections: [{ films: [{ id: 1, angles: {} }] }] }));
});
test("remplacer chaque emplacement conserve les trois autres positions", () => {
  const current = pool.slice(0, 4);
  for (let index = 0; index < 4; index++) {
    const next = replaceProgrammeSlot(pool, current, current[index].id, { filters: { effect: "open" }, previous: current.map((m) => m.id) });
    assert.equal(next.length, 4); assert.notEqual(next[index].id, current[index].id);
    for (let i = 0; i < 4; i++) if (i !== index) assert.equal(next[i].id, current[i].id);
  }
});
test("les budgets invalides ne deviennent jamais une durée illimitée", () => {
  for (const budget of [0, -1, NaN, Infinity, "120", null, 901]) {
    assert.deepEqual(chooseTogether(pool, {}, {}, budget), []);
    assert.equal(doubleFeature(pool, budget), null);
  }
  assert.ok(chooseTogether(pool, {}, {}, 120).length);
  assert.ok(doubleFeature(pool, 240));
});
test("indisponibilité explicite prévaut sur un ancien statut vérifié", () => {
  const unavailable = movie(1, { availability: { available: false } });
  assert.equal(eligible(unavailable), false);
  assert.deepEqual(itinerary([unavailable], { films: [{id: 1, order: 1}] }), []);
});

test("régression des captures : documentaire et deux Godzilla ne remplacent pas la demande de suspense", () => {
  const movies = [movie(1, { title: "Portraits Fantômes", genreIds: [99] }), movie(2, { title: "Godzilla vs Destroyah", genreIds: [878], collectionId: 50 }), movie(3, { title: "Godzilla Mothra", genreIds: [878], collectionId: 50 }), ...[4, 5, 6, 7, 8, 9, 10, 11].map((id) => movie(id, { genreIds: [53] }))];
  const first = recompose(movies, { filters: { effect: "captivate" } });
  assert.equal(first.length, 4); assert.ok(first.slice(0, 3).every((m) => intentEvidence(m, "captivate").length));
  assert.notEqual(first[0].id, 1);
  const renewed = recompose(movies, { filters: { effect: "captivate" }, previous: first.map((m) => m.id) });
  assert.ok(renewed.slice(0, 3).every((m) => intentEvidence(m, "captivate").length));
  assert.ok(renewed.filter((m) => !first.some((f) => f.id === m.id)).length >= 3);
  const open = recompose(movies, { filters: { effect: "open" } });
  assert.ok(open.filter((m) => m.collectionId === 50).length <= 1);
  assert.equal(tooSimilar({ ...movies[1], collectionId: null }, { ...movies[2], collectionId: null }), false);
});
test("une réserve sans indice pour l’envie ne produit pas de faux choix juste", () => {
  assert.equal(recompose([movie(1, { genreIds: [99] })], { filters: { effect: "captivate" } }).length, 0);
  assert.equal(intentEvidence(movie(2, { genreIds: [18, 16, 14, 35, 10751, 10749, 9648, 12] }), "captivate").length, 0);
  assert.ok(intentEvidence(movie(3, { keywords: ["poetry"] }), "wonder").length);
});

test("les contraintes dures refusent les inconnus, les indisponibles et les vetoes", () => {
  assert.equal(eligible(movie(1, { runtime: 0 }), { maxRuntime: 120 }), false);
  assert.equal(eligible(movie(1, { verified: false }), {}), false);
  assert.equal(eligible(movie(1), { maxRuntime: 80 }), false);
  assert.equal(eligible(movie(1), {}, { excludedGenres: [18] }), false);
  assert.equal(eligible(movie(1), { minYear: 2001 }), false);
  assert.equal(eligible(movie(1), { hideSeen: true, seen: [1] }), false);
});
test("le remplacement conserve les verrous, les contraintes et renouvelle sans doublons", () => {
  const next = recompose(pool, { filters: { maxRuntime: 120 }, locked: [1], previous: [1, 2, 3, 4] });
  assert.equal(next[0].id, 1); assert.equal(next.length, 4);
  assert.equal(new Set(next.map((m) => m.id)).size, 4);
  assert.ok(next.slice(1).every((m) => ![2, 3, 4].includes(m.id)));
  assert.ok(next.every((m) => m.runtime <= 120));
  assert.equal(recompose(pool, { locked: [1], excluded: [1], filters: { maxRuntime: 40 } }).length, 0);
});
test("les préférences explicites modifient réellement le premier choix", () => {
  const films = [movie(1), movie(2, { genreIds: [35] })];
  assert.equal(recompose(films, { profile: { preferredGenres: [35] } })[0].id, 2);
});
test("les explications n’inventent pas un contraste absent", () => {
  assert.match(explainProgramme([movie(1), movie(2)])[1].role.description, /pas de contraste documenté/);
  assert.match(explainProgramme([movie(1), movie(2, { originalLanguage: "fa" })])[1].role.description, /FA au lieu de FR/);
});
test("collections : identité explicite, liens sûrs et annotations sourcées", () => {
  assert.throws(() => normalizeCollection({ films: [{ title: "Homonyme" }] }));
  const c = normalizeCollection({ name: "Essai", source: "javascript:alert(1)", films: [{ id: 1, angles: ["closed", "inventé"], note: "Annotation", source: "https://example.org/source" }, { id: 1 }] });
  assert.equal(c.source, ""); assert.equal(c.films.length, 1);
  assert.equal(filmAngles(movie(1), [c]).length, 0); // Last duplicate wins, no annotation remains.
  const valid = normalizeCollection({ films: [{ id: 1, angles: ["closed"], note: "Lieu unique", source: "https://example.org/source" }] });
  assert.equal(filmAngles(movie(1), [valid])[0].id, "closed");
  assert.equal(filmAngles(movie(2, { keywords: ["urban life"] }))[0].kind, "Indice documentaire");
  assert.equal(ANGLES.length, 5);
});
test("les rapprochements portent sur l’axe demandé, pas sur le seul genre", () => {
  assert.equal(relatedMovies(movie(1), [movie(2), movie(3, { director: "Autre" })], "director").length, 1);
  assert.equal(relatedMovies(movie(1), [movie(2, { keywords: [] })], "theme").length, 0);
  assert.equal(relatedMovies(movie(1), [movie(2)], "form").length, 0);
});
test("réceptions opposées : couverture minimale et RT non comparable", () => {
  const ratings = [{ source: "Internet Movie Database", value: "8.1/10" }, { source: "Metacritic", value: "41/100" }, { source: "Rotten Tomatoes", value: "99%" }];
  assert.equal(receptionContrast(movie(1, { imdbVotes: 3000, perspectives: [{ ratings }] })).contrasted, true);
  assert.equal(receptionContrast(movie(1, { imdbVotes: 30, perspectives: [{ ratings }] })).covered, false);
  assert.equal(receptionContrast(movie(1, { imdbVotes: 3000, perspectives: [{ ratings: [ratings[0], ratings[2]] }] })).covered, false);
});
test("double séance inclut l’entracte et n’utilise pas de durée inconnue", () => {
  assert.equal(doubleFeature([movie(1), movie(2)], 189), null);
  assert.equal(doubleFeature([movie(1), movie(2)], 190).total, 190);
  assert.equal(doubleFeature([movie(1), movie(2, { runtime: 0 })], 240), null);
  assert.equal(doubleFeature([movie(1), movie(2, { keywords: [], director: "Autre" })], 240, "echo"), null);
});
test("choix à deux respecte chaque veto et explicite les soutiens", () => {
  const films = [movie(1), movie(2, { genreIds: [35] }), movie(3, { genreIds: [99] })];
  const result = chooseTogether(films, { preferredGenres: [35], excludedGenres: [99] }, { preferredGenres: [35], excludedGenres: [18] }, 120);
  assert.deepEqual(result.map((m) => m.id), [2]); assert.equal(result[0].support, 2);
});
test("parcours : ordre de collection, disponibilité requise, pas de remplissage", () => {
  const result = itinerary([movie(1), movie(2, { verified: false }), movie(3)], { name: "Parcours", films: [{ id: 3, order: 2 }, { id: 1, order: 1 }, { id: 2, order: 0 }] });
  assert.deepEqual(result.map((m) => m.id), [1, 3]);
});
test("le profil propose seulement à partir d’au moins trois appréciations explicites", () => {
  assert.equal(profileHypotheses(pool).length, 0);
  assert.equal(profileHypotheses(pool.slice(0, 3).map((m) => ({ ...m, liked: true })))[0].count, 3);
});
test("import : pas de plafond de huit films, collections invalides écartées, historique explicite", () => {
  const p = sanitizePreferences({ shortlist: [...pool, pool[0]], seen: "bad", collections: [{ name: "sans films" }], profile: { excludedGenres: [18, "bad"] }, history: [movie(1), { ...movie(2), liked: true }] });
  assert.equal(p.shortlist.length, 12); assert.deepEqual(p.seen, []); assert.deepEqual(p.collections, []);
  assert.deepEqual(p.profile.excludedGenres, [18]); assert.equal(p.history.length, 1);
});
