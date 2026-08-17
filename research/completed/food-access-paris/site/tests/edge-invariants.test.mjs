import assert from "node:assert/strict";
import test from "node:test";

import {
  accessRank,
  arrondissementRank,
  matchesQuery,
  normalizeSearch,
  parisDate,
  phoneHref,
  recommendPlaces,
  statusFor,
} from "../app/finder-core.ts";
import { accessLabels, places } from "../app/places.ts";

const byId = (id) => places.find((place) => place.id === id);
const atNoon = (date) => new Date(`${date}T12:00:00Z`);
const all = (predicate) => places.every(predicate);

const cases = [
  ["exactement 34 fiches sont intégrées", () => assert.equal(places.length, 34)],
  ["chaque identifiant est unique", () => assert.equal(new Set(places.map((p) => p.id)).size, places.length)],
  ["les identifiants restent compatibles URL", () => assert.ok(all((p) => /^[a-z0-9-]+$/.test(p.id)))],
  ["chaque nom est renseigné", () => assert.ok(all((p) => p.name.trim().length > 0))],
  ["chaque service est renseigné", () => assert.ok(all((p) => p.service.trim().length > 0))],
  ["chaque public est renseigné", () => assert.ok(all((p) => p.audience.trim().length > 0))],
  ["chaque horaire est renseigné", () => assert.ok(all((p) => p.schedule.trim().length > 0))],
  ["chaque adresse ou modalité d’adresse est renseignée", () => assert.ok(all((p) => p.address.trim().length > 0))],
  ["aucune fiche n’a une liste de jours vide", () => assert.ok(all((p) => p.days.length > 0))],
  ["tous les jours sont compris entre dimanche et samedi", () => assert.ok(all((p) => p.days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)))],
  ["aucun jour n’est dupliqué dans une fiche", () => assert.ok(all((p) => new Set(p.days).size === p.days.length))],
  ["les quatre modalités d’accès sont couvertes", () => assert.deepEqual(new Set(places.map((p) => p.access)), new Set(["libre", "orientation", "inscription", "carte"]))],
  ["chaque modalité possède un libellé", () => assert.ok(all((p) => Boolean(accessLabels[p.access])))],
  ["les pages sources appartiennent à l’un des deux documents contrôlés", () => assert.ok(all((p) => p.sourceUrl ? p.sourcePage === 4 && p.sourceUrl.includes("2026/06/04/diner-dans-les-restaurants-solidaires") : p.sourcePage >= 42 && p.sourcePage <= 58))],
  ["quatorze zones parisiennes sont représentées", () => assert.equal(new Set(places.map((p) => p.arrondissement)).size, 14)],
  ["au moins une solution est libre chaque jour", () => {
    for (let day = 0; day < 7; day += 1) assert.ok(places.some((p) => p.access === "libre" && p.days.includes(day)));
  }],
  ["les dates d’activité et de révision ont un format ISO", () => assert.ok(all((p) => [p.activeFrom, p.activeUntil, p.reviewAfter].filter(Boolean).every((d) => /^2026-\d{2}-\d{2}$/.test(d))))],
  ["aucune période d’activité n’est inversée", () => assert.ok(all((p) => !p.activeFrom || !p.activeUntil || p.activeFrom <= p.activeUntil))],
  ["aucune fermeture n’est inversée", () => assert.ok(all((p) => (p.closures ?? []).every(([start, end]) => start <= end)))],
  ["les courriels présents ont une forme minimale valide", () => assert.ok(all((p) => !p.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)))],
  ["les téléphones présents produisent un lien appelable", () => assert.ok(all((p) => !p.phone || /^tel:\+?\d+$/.test(phoneHref(p.phone))))],
  ["la date parisienne franchit minuit avant UTC", () => assert.deepEqual(parisDate(new Date("2026-08-16T22:30:00Z")), { key: "2026-08-17", day: 1 })],
  ["la date parisienne reste correcte en heure d’hiver", () => assert.deepEqual(parisDate(new Date("2026-01-04T23:30:00Z")), { key: "2026-01-05", day: 1 })],
  ["la donnée expire dès le 1er septembre parisien", () => assert.equal(statusFor(byId("saint-merry"), new Date("2026-08-31T22:30:00Z")), "expired")],
  ["une fiche permanente reste courante après l’expiration estivale", () => assert.equal(statusFor(byId("solidaire-baudricourt"), atNoon("2026-09-01")), "today")],
  ["un lieu avant sa date de début est fermé", () => assert.equal(statusFor(byId("aspp-hotel-de-ville"), atNoon("2026-07-12")), "closed")],
  ["un lieu est actif le jour exact de son ouverture", () => assert.equal(statusFor(byId("aspp-hotel-de-ville"), atNoon("2026-07-13")), "today")],
  ["un lieu est actif le jour exact de sa fin", () => assert.equal(statusFor(byId("aspp-hotel-de-ville"), atNoon("2026-08-30")), "today")],
  ["un lieu fermé après sa date de fin n’est pas présenté ouvert", () => assert.equal(statusFor(byId("aspp-hotel-de-ville"), atNoon("2026-08-31")), "closed")],
  ["le début d’une fermeture inclusive est fermé", () => assert.equal(statusFor(byId("secours-populaire-18"), atNoon("2026-08-10")), "closed")],
  ["la fin d’une fermeture inclusive est fermée", () => assert.equal(statusFor(byId("secours-populaire-18"), atNoon("2026-08-16")), "closed")],
  ["entre deux fermetures le jour hebdomadaire gouverne", () => assert.equal(statusFor(byId("secours-populaire-18"), atNoon("2026-08-17")), "other-day")],
  ["un service du lundi remonte le lundi", () => assert.equal(statusFor(byId("linkee-13"), atNoon("2026-08-17")), "today")],
  ["un service du lundi ne remonte pas comme prévu le mardi", () => assert.equal(statusFor(byId("linkee-13"), atNoon("2026-08-18")), "other-day")],
  ["une fiche à vérifier conserve cet avertissement le bon jour", () => assert.equal(statusFor(byId("saint-germain-des-pres"), atNoon("2026-08-16")), "verify")],
  ["une fiche à vérifier ne masque pas un mauvais jour", () => assert.equal(statusFor(byId("saint-germain-des-pres"), atNoon("2026-08-17")), "other-day")],
  ["la recherche ignore les accents", () => assert.equal(matchesQuery(byId("linkee-13"), "etudiant"), true)],
  ["la recherche ignore les tirets", () => assert.equal(matchesQuery(byId("saint-blaise"), "saint blaise"), true)],
  ["la recherche ignore l’apostrophe typographique", () => assert.equal(matchesQuery(byId("porte-villette"), "l un est l autre"), true)],
  ["la recherche couvre les horaires", () => assert.equal(matchesQuery(byId("gamelle-jaures"), "20h30"), true)],
  ["la recherche couvre les notes", () => assert.equal(matchesQuery(byId("cantine-arbustes"), "tres frequente"), true)],
  ["la recherche couvre les modalités d’accès", () => assert.equal(matchesQuery(byId("restaurant-atlas"), "sur orientation"), true)],
  ["la recherche multi-termes accepte un ordre différent", () => assert.equal(matchesQuery(byId("porte-villette"), "villette repas"), true)],
  ["une recherche vide conserve toutes les fiches", () => assert.ok(all((p) => matchesQuery(p, "   ")))],
  ["une recherche absente ne fabrique aucun résultat", () => assert.equal(places.filter((p) => matchesQuery(p, "licorne quantique")).length, 0)],
  ["la normalisation contracte les espaces", () => assert.equal(normalizeSearch("  Petit   déjeuner  "), "petit dejeuner")],
  ["Centre est trié avant les arrondissements numériques", () => assert.ok(arrondissementRank("Centre") < arrondissementRank("5e"))],
  ["5e est trié avant 10e numériquement", () => assert.ok(arrondissementRank("5e") < arrondissementRank("10e"))],
  ["à statut égal, l’accès libre précède la carte", () => assert.ok(accessRank(byId("saint-merry")) < accessRank(byId("solidaire-boutebrie")))],
  ["trois recommandations libres sont produites le lundi", () => {
    const results = recommendPlaces(places, { arrondissement: "tous", need: "meal", accessMode: "free", now: atNoon("2026-08-17") });
    assert.equal(results.length, 3);
    assert.ok(results.every(({ place, status }) => place.access === "libre" && ["today", "verify"].includes(status)));
  }],
];

assert.equal(cases.length, 50, "la batterie doit contenir exactement 50 tests-limites");

for (const [index, [name, run]] of cases.entries()) {
  test(`${String(index + 1).padStart(2, "0")}/50 — ${name}`, run);
}
