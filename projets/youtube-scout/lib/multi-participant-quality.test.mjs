import test from "node:test";
import assert from "node:assert/strict";
import { searchCreditChoices } from "../public/artist-names.mjs";
import { departureArtistsUpdate, declaredDepartureArtist } from "../public/departure-workflow.mjs";
import { departureRoutingGraph } from "../public/departure-integrity.mjs";
import { departureArtistIds, isOtherArtist } from "../public/music-sorting.mjs";
import { buildScoutMixView, consumeMixPage } from "../public/scout-mix-session.mjs";
import { createScoutPatch, setScoutParameter } from "../public/scout-parameters.mjs";
import { titleCreditSuggestion, videoContent } from "../public/video-content.mjs";
import { routeExplanation } from "../public/discovery-presentation.mjs";
import { graphIndex, directionAnchors } from "./catalogue-graph.mjs";
import { exploreCatalogueBranch } from "./catalogue.mjs";
import { PersistentStore } from "./persistent-store.mjs";
import { EphemeralExplorations } from "./ephemeral-exploration.mjs";

const credit = "Deen Burbigo, Eff Gee, Ratu$, Esso Luxueux, Stutt, robdbloc, Blaz Pit";
const seed = { id: "video:youtube:fixture1234", type: "video", title: "Saboteur", departureCorrection: { revision: "r1" } };
const choice = (id, name) => ({ id: `artist:discogs:${id}`, name, source: "discogs", entity: { id: `artist:discogs:${id}`, type: "artist", name, externalIds: { discogs: String(id) } } });
const merge = (graph, delta) => ({ entities: { ...graph.entities, ...Object.fromEntries(delta.entities.map(n => [n.id, n])) }, edges: { ...graph.edges, ...Object.fromEntries(delta.edges.map(e => [`${e.from}:${e.kind}:${e.to}`, e])) } });
const select = (items, { exclude }) => items.filter(item => !exclude.includes(item.id));
const row = (id, extra = {}) => ({ id, type: "track", title: `Song ${id}`, artist: "Cookin’ Soul", releaseId: "album", ...extra });
const mix = (items, options = {}) => buildScoutMixView({ seedId: seed.id, groups: { remix: { items } }, select, ...options });

test("les sept participants sont recherchés, concurrence bornée et noms conservés par groupe", async () => {
  let active = 0, peak = 0; const queries = [];
  const result = await searchCreditChoices(credit, async name => {
    active++; peak = Math.max(peak, active); queries.push(name);
    await new Promise(resolve => setTimeout(resolve, 1)); active--;
    if (name === "Ratu$") throw new Error("source indisponible");
    return { candidates: [choice(queries.indexOf(name) + 1, name)], sourceStates: { discogs: "ok" } };
  });
  assert.equal(queries.length, 8); assert.equal(peak, 3);
  for (const name of credit.split(", ")) assert.ok(queries.includes(name));
  assert.equal(result.groups.find(g => g.query === "Ratu$").state, "unavailable");
  assert.equal(result.groups.find(g => g.query === "Blaz Pit").candidates[0].name, "Blaz Pit");
  assert.equal(result.confirmed, undefined);
});

test("changer de départ arrête les lots suivants de recherche", async () => {
  let current = true, count = 0;
  const result = await searchCreditChoices(credit, async () => { count++; current = false; return {}; }, { isCurrent: () => current });
  assert.equal(count, 3); assert.equal(result.cancelled, true);
});

test("validation multi-artistes atomique : préserver les crédits, les révisions et les identités séparées", () => {
  const graph = { entities: { [seed.id]: seed }, edges: {} }, before = structuredClone(graph);
  const choices = [choice(1, "Deen Burbigo"), choice(2, "Eff Gee"), choice(3, "Blaz Pit")];
  const updated = merge(graph, departureArtistsUpdate(graph, seed, credit, choices));
  assert.equal(declaredDepartureArtist(updated, seed.id), credit);
  assert.deepEqual(departureArtistIds(updated, seed.id).sort(), choices.map(c => c.id).sort());
  assert.ok(Object.values(updated.edges).every(e => e.departureRevision === "r1"));
  assert.deepEqual(graph, before);
  assert.ok(!Object.values(updated.edges).some(e => e.kind === "same_identity"));
  assert.equal(isOtherArtist({ artist: "Eff Gee", artistIds: [choices[1].id] }, { name: credit, artistIds: departureArtistIds(updated, seed.id) }), false);
  const { starts } = directionAnchors(graphIndex(updated), seed.id, "featuring");
  assert.ok(choices.every(c => starts.has(c.id)), "chaque participant doit ouvrir une origine de routage");
  const revised = merge(updated, departureArtistsUpdate(updated, seed, credit, [choices[2]]));
  assert.deepEqual(departureArtistIds(revised, seed.id), [choices[2].id]);
  assert.equal(declaredDepartureArtist(revised, seed.id), credit);
  const corrected = structuredClone(updated); corrected.entities[seed.id].departureCorrection.revision = "r2";
  assert.equal(departureArtistIds(departureRoutingGraph(corrected), seed.id).length, 0);
});

test("les crédits longs restent entiers et les validations vides sont refusées", () => {
  const graph = { entities: { [seed.id]: seed }, edges: {} }, name = "Artiste ".repeat(30).trim();
  const updated = merge(graph, departureArtistsUpdate(graph, seed, name, [choice(1, "Artiste")]));
  assert.equal(declaredDepartureArtist(updated, seed.id), name);
  assert.throws(() => departureArtistsUpdate(graph, seed, credit, []), /au moins/);
  assert.throws(() => departureArtistsUpdate(graph, seed, "x".repeat(301), [choice(1, "A")]), /300/);
});

test("échec durable du lot : aucun choix partiel ; reprise et isolation des départs", async () => {
  const personal = new PersistentStore(null); personal.loaded = true;
  const digs = new EphemeralExplorations({ personal });
  const token = await digs.start(seed.id);
  const run = action => digs.context.run(digs.get(token), action);
  await run(() => digs.store.ingestGraph({ entities: [{ id: seed.id, type: "video", title: seed.title }], edges: [] }));
  const before = run(() => digs.store.snapshot());
  const delta = departureArtistsUpdate(before, seed, credit, [choice(1, "Deen"), choice(2, "Eff")]);
  personal.persist = async () => { throw new Error("disk full"); };
  await assert.rejects(run(() => digs.store.ingestGraph(delta)), /disk full/);
  assert.deepEqual(run(() => digs.store.snapshot()), before);
  assert.equal(Object.keys(personal.state.edges).length, 0);
  personal.persist = async () => {};
  await run(() => digs.store.ingestGraph(delta));
  const reopened = await digs.start(seed.id);
  const restored = digs.context.run(digs.get(reopened), () => digs.store.snapshot());
  assert.equal(declaredDepartureArtist(restored, seed.id), credit);
  assert.deepEqual(departureArtistIds(restored, seed.id).sort(), ["artist:discogs:1", "artist:discogs:2"]);
  const other = await digs.start("video:youtube:otherseed");
  assert.deepEqual(digs.context.run(digs.get(other), () => digs.store.snapshot()).entities, {});
});

test("un partenaire connu du premier artiste ne bloque pas le catalogue du second", async () => {
  let graph = { entities: { [seed.id]: seed }, edges: {} };
  graph = merge(graph, departureArtistsUpdate(graph, seed, credit, [choice(1, "Deen"), choice(2, "Eff")]));
  graph = merge(graph, { entities: [choice(3, "Partenaire").entity], edges: [{ from: "artist:discogs:1", to: "artist:discogs:3", kind: "featured_with", status: "observed", source: "fixture" }] });
  const calls = [];
  const result = await exploreCatalogueBranch({ graph, seedId: seed.id, direction: "featuring", configured: { discogs: true }, requestBudget: 20, minimumEligible: 6,
    request: async (_, path) => { calls.push(path); return path.endsWith("/releases") ? { releases: [], pagination: { pages: 1 } } : { id: Number(path.split("/").at(-1)), name: "Fixture" }; } });
  assert.ok(calls.includes("/artists/2/releases"));
  assert.ok(result.coverage.fetchedRequests <= 20);
});

test("décisions concurrentes : une écriture refusée ne fuit ni dans les lectures ni dans le lot suivant", async () => {
  const personal = new PersistentStore(null); personal.loaded = true;
  let releaseWrite, signalStarted;
  const started = new Promise(resolve => { signalStarted = resolve; });
  const gate = new Promise((_, reject) => { releaseWrite = reject; });
  let count = 0;
  personal.persist = async () => { if (++count === 1) { signalStarted(); await gate; } };
  const first = personal.commitPersonalGraph({ entities: [choice(1, "Refusé").entity] });
  const rejected = assert.rejects(first, /disk full/);
  await started;
  const second = personal.commitPersonalGraph({ entities: [choice(2, "Conservé").entity] });
  assert.deepEqual(personal.snapshot().entities, {});
  releaseWrite(new Error("disk full"));
  await rejected; await second;
  assert.deepEqual(Object.keys(personal.snapshot().entities), ["artist:discogs:2"]);
});

test("le mode équilibré ne remplit plus six places avec le même album et reste parcourable", () => {
  const rows = Array.from({ length: 8 }, (_, i) => row(`track${i}`));
  const result = mix(rows);
  assert.equal(result.items.length, 1); assert.equal(result.diversityLimited, true); assert.equal(result.candidates, 8);
  const next = mix(rows, { history: consumeMixPage({}, result) });
  assert.equal(next.items.length, 1); assert.notEqual(next.items[0].id, result.items[0].id);
  assert.equal(mix(rows, { patch: { shape: { spread: 0 } } }).items.length, 6);
  assert.equal(mix(rows, { directionFilter: "remix" }).items.length, 6);
  const varied = mix(rows.map((item, i) => ({ ...item, artist: `Artist ${i}`, releaseId: `Album ${i}` })));
  assert.equal(varied.items.length, 6); assert.equal(varied.diversityLimited, false);
});

test("marqueurs éditoriaux et promotionnels : filtrage réversible, aucune suppression", () => {
  const rows = [row("video:youtube:doc", { type: "video", title: 'Danyl : Documentaire « entre deux lignes » | Grünt' }),
    row("video:youtube:promo", { type: "video", title: "Grünt #74 feat. @leratluciano Ce soir 18h #rap" }),
    row("video:youtube:music", { type: "video", title: "Le Rat Luciano | Grünt #74" })];
  const before = structuredClone(rows);
  assert.equal(videoContent(rows[0]).kind, "editorial"); assert.equal(videoContent(rows[1]).kind, "promotional");
  assert.equal(mix(rows).candidates, 1);
  let patch = setScoutParameter(createScoutPatch(), "scope.editorial", true);
  patch = setScoutParameter(patch, "scope.promotional", true);
  assert.equal(mix(rows, { patch }).candidates, 3); assert.deepEqual(rows, before);
  assert.equal(videoContent(row("track", { title: "Interview" })).kind, "music");
  assert.equal(videoContent({ type: "video", title: "Tomorrow is mine" }).kind, "unknown");
});

test("les publications d'une session ne monopolisent pas la page sans être fusionnées", () => {
  const rows = [74, 74, 74, 75, 76].map((session, i) => row(`video:youtube:${i}`, { type: "video", title: `Artist ${i} | Grünt #${session}`, artist: `Artist ${i}`, releaseId: "", channelId: "channel" }));
  const result = mix(rows);
  assert.equal(result.items.length, 3); assert.equal(result.candidates, 5);
  assert.equal(mix(rows, { directionFilter: "remix" }).items.length, 5);
});

test("noms suggérés dans le titre : ni identité ni attribution à la chaîne", () => {
  const suggestion = titleCreditSuggestion({ title: `Saboteur (${credit}) | Grünt #53`, channelTitle: "Grünt" });
  assert.equal(suggestion.title, "Saboteur"); assert.equal(suggestion.name, credit); assert.equal(suggestion.id, undefined);
  assert.equal(titleCreditSuggestion({ title: "BEN plg | Grünt #76", channelTitle: "Grünt" }).name, "BEN plg");
  assert.equal(titleCreditSuggestion({ title: "Titre sans crédits", channelTitle: "Grünt" }), null);
  assert.equal(titleCreditSuggestion({ title: "Fave | Entretien - Documentaire | Grünt", channelTitle: "Grünt" }), null);
  assert.equal(titleCreditSuggestion({ title: "A song (Live, 2020) | Channel", channelTitle: "Channel" })?.title, undefined);
});

test("explication : conserver le chemin et signaler le détour par la discographie", () => {
  const text = routeExplanation({ path: [{ from: { label: "Saboteur" }, to: { label: "Deen Burbigo" }, relation: "probable_artist" }, { from: { label: "Deen Burbigo" }, to: { label: "Autre morceau" }, relation: "credited_on" }], evidence: [{ source: "discogs" }] });
  assert.match(text, /Saboteur → Deen Burbigo → Autre morceau/);
  assert.match(text, /ne confirme pas un crédit sur le morceau de départ/);
});
