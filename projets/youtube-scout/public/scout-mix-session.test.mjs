import test from "node:test";
import assert from "node:assert/strict";
import { SCOUT_DIRECTIONS } from "./scout-parameters.mjs";
import { buildScoutMixView, consumeMixPage, mixHistoryForSeed, runScoutMixLoad } from "./scout-mix-session.mjs";

const row = (id, extra = {}) => ({ id, title: `Track ${id}`, artist: `Artist ${id}`, status: "candidate", ...extra });
const select = (items, { exclude = [], limit = items.length } = {}) => items.filter(item => !exclude.includes(item.id)).slice(0, limit);
const weights = overrides => ({ directionWeights: Object.fromEntries(SCOUT_DIRECTIONS.map(({ id }) => [id, overrides[id] ?? 0])) });
const twoGroups = () => ({
  label: { items: Array.from({ length: 12 }, (_, index) => row(`L${index}`)) },
  curator: { items: Array.from({ length: 12 }, (_, index) => row(`C${index}`)) }
});
const view = (options = {}) => buildScoutMixView({ seedId: "video:youtube:seed", groups: twoGroups(), patch: weights({ label: 1, curator: 1 }), select, ...options });

test("les co-crédits partagés ne monopolisent pas un tri chronologique diversifié", () => {
  const rows = Array.from({ length: 8 }, (_, i) => row(`edge-${i}`, { artist: `EDGE & Guest ${i}`, artistIds: ["edge", `guest-${i}`], releaseDate: "2025-01-01" }));
  rows.push(row("other", { artist: "Another", artistIds: ["another"], releaseDate: "2020-01-01" }));
  const options = { groups: { featuring: { items: rows } }, patch: { ...weights({ featuring: 1 }), sort: "release-new", shape: { spread: 1 } } };
  const mixed = view(options);
  assert.ok(mixed.items.slice(0, 3).some(item => item.id === "other"));
  const strict = view({ ...options, patch: { ...options.patch, shape: { spread: 0 } } });
  assert.ok(strict.items.every(item => item.id.startsWith("edge-")));
  assert.equal(mixed.candidates, 9, "la diversité ne supprime aucune piste du pool");
});

test("le mix appelle le sélecteur existant par route et lui transmet orientation et exclusions", () => {
  const calls = [];
  view({ focus: "depth", seedArtist: "Start", history: { seedId: "video:youtube:seed", seenIds: ["L0"], turn: 2 },
    select: (items, options) => { calls.push(options); return select(items, options); } });
  assert.equal(calls.length, 2);
  assert.ok(calls.every(call => call.focus === "depth" && call.seedArtist === "Start" && call.turn === 2 && call.exclude.includes("L0")));
});

test("Spread 1 empêche un curator unique de monopoliser un mix à poids égaux", () => {
  assert.deepEqual(view().items.map(item => item.id), ["L0", "C0", "L1", "L2", "L3", "L4"]);
});

test("Spread 1 borne le curator même quand son poids est supérieur", () => {
  const result = view({ patch: weights({ label: .2, curator: .9 }) });
  assert.equal(result.items.filter(item => item.routing.selectedVia === "curator").length, 1);
  assert.equal(result.items.length, 6);
});

test("200 vidéos d'une même chaîne restent toutes accessibles par pages filtrées", () => {
  const groups = { curator: { items: Array.from({ length: 200 }, (_, i) => row(`upload:${i}`, { channelId: "same-channel" })) } };
  let history = {}, ids = [];
  for (let page = 0; page < 34; page++) {
    const result = view({ groups, history, directionFilter: "curator" });
    assert.equal(result.candidates, 200 - ids.length);
    assert.equal(result.items.length, Math.min(6, 200 - ids.length));
    assert.equal(result.hasNextPage, result.candidates > result.items.length);
    assert.equal(result.routes.find(r => r.id === "curator").eligible, result.candidates);
    ids.push(...result.items.map(item => item.id));
    history = consumeMixPage(history, result);
  }
  assert.equal(new Set(ids).size, 200);
  assert.equal(view({ groups, history, directionFilter: "curator" }).candidates, 0);
});

test("la diversité limite la page mixte, jamais son compteur de pistes restantes", () => {
  const result = view();
  assert.equal(result.items.filter(item => item.routing.selectedVia === "curator").length, 1);
  assert.equal(result.candidates, 24);
  assert.equal(result.hasNextPage, true);
  assert.equal(view({ history: consumeMixPage({}, result) }).candidates, 18);
});

test("une chaîne seule remplit la page et n'est pas bloquée par l'anti-monopole", () => {
  const result = view({ patch: weights({ curator: 1 }) });
  assert.equal(result.items.length, 6);
  assert.equal(result.candidates, 12);
  assert.equal(result.hasNextPage, true);
});

test("une page mixte réduite garde les vidéos accessibles sans remplir silencieusement", () => {
  const groups = { label: { items: [row("label")] }, curator: { items: Array.from({ length: 8 }, (_, i) => row(`C${i}`)) } };
  const result = view({ groups });
  assert.equal(result.items.length, 2);
  assert.equal(result.diversityLimited, true);
  const last = view({ groups, history: consumeMixPage({}, result) });
  assert.ok(last.items.length > 0);
  const focused = view({ groups, history: consumeMixPage({}, result), directionFilter: "curator" });
  assert.equal(focused.items.length, 6);
  assert.equal(focused.hasNextPage, true);
});

test("augmenter LABEL inverse réellement la répartition de la sortie", () => {
  const result = view({ patch: weights({ label: .9, curator: .2 }) });
  assert.equal(result.items.filter(item => item.routing.selectedVia === "label").length, 5);
});

test("tous les poids à zéro restent silencieux sans fallback implicite", () => {
  const result = view({ patch: weights({}) });
  assert.deepEqual(result.items, []);
  assert.ok(result.routes.every(route => !route.canLoad));
});

test("une route coupée n'est jamais déclarée épuisée", () => {
  assert.equal(view({ patch: weights({ curator: 1 }) }).routes.find(route => route.id === "label").state, "muted");
});

test("pause et confirmation bloquent aussi les anciens résultats en cache", () => {
  const result = view({
    front: { branches: [{ direction: "curator", status: "paused" }] },
    guidance: { state: "needs_confirmation", directions: ["label"] }
  });
  assert.deepEqual(result.items, []);
  assert.ok(result.routes.every(route => !route.canLoad));
});

test("une bibliothèque/graphe ancien sans départ actif ne produit aucune sortie", () => {
  const result = view({ seedId: "", select: () => { throw new Error("Ne doit pas être appelé"); } });
  assert.equal(result.items.length, 0);
});

test("un même ID conserve chaque observation et ne devient pas confirmé par addition", () => {
  const label = row("shared", { evidence: ["discogs"], path: [{ from: "a", to: "b" }] });
  const curator = row("shared", { evidence: ["youtube"], path: [{ from: "c", to: "d" }] });
  const result = view({ groups: { label: { items: [label] }, curator: { items: [curator] } } });
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].status, "candidate");
  assert.equal(result.items[0].routing.observations.length, 2);
  assert.strictEqual(result.items[0].routing.observations[0].item, label);
  assert.strictEqual(result.items[0].routing.observations[1].item, curator);
  assert.equal(result.items[0].routing.score, 2);
});

test("un même titre à IDs distincts n'est pas une fusion d'identités", () => {
  const result = view({ groups: { label: { items: [row("id-a", { title: "Same" }), row("id-b", { title: "Same" })] } } });
  assert.equal(result.items.length, 2);
});

test("même un sélecteur mutateur ne modifie pas les groupes ni les preuves d'entrée", () => {
  const groups = twoGroups(); const before = structuredClone(groups);
  view({ groups, select: items => { items[0].status = "modified by selector"; return items; } });
  assert.deepEqual(groups, before);
});

test("le sélecteur ne peut pas réinjecter un candidat absent du groupe fourni", () => {
  assert.equal(view({ select: () => [row("outsider")] }).items.length, 0);
});

test("AUTRES PISTES consomme uniquement les six cartes du mix, jamais le reste des catalogues", () => {
  const initial = view(); const history = consumeMixPage({}, initial);
  assert.deepEqual(history.seenIds, initial.items.map(item => item.id));
  const next = view({ history });
  assert.equal(next.items.some(item => history.seenIds.includes(item.id)), false);
  assert.equal(history.turn, 1);
  assert.equal("heard" in history, false);
});

test("tourner un réglage ne consomme aucune piste et ne modifie pas selectedIds", () => {
  const groups = twoGroups(); groups.label.selectedIds = ["L0"];
  const before = JSON.stringify(groups);
  const a = view({ groups }); const b = view({ groups });
  assert.deepEqual(a.items.map(item => item.id), b.items.map(item => item.id));
  assert.equal(JSON.stringify(groups), before);
});

test("une ancienne histoire de mix ne masque pas les pistes d'un autre départ", () => {
  assert.deepEqual(mixHistoryForSeed({ seedId: "old", turn: 99, seenIds: ["L0"] }, "new"), { seedId: "new", turn: 0, seenIds: [] });
});

test("les pistes vues via une autre direction ne réapparaissent pas dans le mix", () => {
  const groups = twoGroups(); groups.curator.seenIds = ["L0"];
  assert.equal(view({ groups }).items.some(item => item.id === "L0"), false);
});

test("une route sans données n'est pas silencieusement présentée comme parcourue", () => {
  const result = view({ groups: {} });
  assert.equal(result.routes.find(route => route.id === "label").state, "pending");
  assert.equal(result.routes.find(route => route.id === "label").canLoad, true);
});

test("changer de départ pendant DIG empêche le chargement de la direction suivante", async () => {
  let current = true; const calls = [];
  const result = await runScoutMixLoad({ directions: ["label", "curator"], isCurrent: () => current, isEnabled: () => true,
    load: async direction => { calls.push(direction); current = false; } });
  assert.deepEqual(calls, ["label"]);
  assert.equal(result.cancelled, true);
});

test("une route coupée avant son chargement n'entraîne pas de requête", async () => {
  const calls = [];
  await runScoutMixLoad({ directions: ["label", "curator"], isCurrent: () => true, isEnabled: direction => direction === "curator", load: async direction => { calls.push(direction); } });
  assert.deepEqual(calls, ["curator"]);
});

test("une erreur de chargement remonte au lieu de produire un succès fictif", async () => {
  await assert.rejects(runScoutMixLoad({ directions: ["label"], isCurrent: () => true, isEnabled: () => true, load: async () => { throw new Error("source down"); } }), /source down/);
});


test("avec huit routes et six places, les dernières routes ne sont pas affamées à chaque page", () => {
  const groups = Object.fromEntries(SCOUT_DIRECTIONS.map(({ id }) => [id, {
    items: Array.from({ length: 12 }, (_, i) => row(`${id}:${i}`))
  }]));
  const patch = weights(Object.fromEntries(SCOUT_DIRECTIONS.map(({ id }) => [id, 1])));
  const first = view({ groups, patch });
  const second = view({ groups, patch, history: consumeMixPage({}, first) });
  assert.equal(new Set([...first.items, ...second.items].map(item => item.routing.selectedVia)).size, 8);
});


test("le patch expose la shape au mix sans créer de second moteur", () => { const result=view({patch:{directionWeights:{label:1,curator:1},shape:{depth:9,spread:0.25}}}); assert.equal(result.patch.shape.depth,9); assert.equal(result.patch.shape.spread,0.25); });

test("le filtre réutilise la liste et son historique sans changer les directions activées", () => {
  const groups = twoGroups(), before = structuredClone(groups);
  const filtered = view({ groups, directionFilter: "curator" });
  assert.ok(filtered.items.length);
  assert.ok(filtered.items.every(item => item.routing.selectedVia === "curator"));
  assert.equal(filtered.routes.find(r => r.id === "label").enabled, true);
  const history = consumeMixPage({}, filtered);
  assert.deepEqual(history.seenIds, filtered.items.map(item => item.id));
  assert.equal(view({ groups, history }).items.some(item => history.seenIds.includes(item.id)), false);
  assert.deepEqual(groups, before);
});

test("filtrer une direction coupée ne l'active pas implicitement", () => {
  const result = view({ directionFilter: "label", patch: weights({ curator: 1 }) });
  assert.equal(result.items.length, 0);
  assert.equal(result.routes.find(r => r.id === "label").canLoad, false);
});

test("une panne de source reste visible et réessayable avec des résultats conservés", () => {
  const result = view({ groups: { label: { items: [row("old")], coverage: { state: "source_unavailable", message: "Quota temporaire" } } } });
  const route = result.routes.find(r => r.id === "label");
  assert.equal(route.state, "unavailable");
  assert.equal(route.message, "Quota temporaire");
  assert.equal(route.canLoad, true);
  assert.equal(route.loadKind, "retry");
  assert.equal(result.items.length, 1);
});
