import test from "node:test";
import assert from "node:assert/strict";
import { exploreCatalogueBranch, discogsReleaseGraph, createCatalogueEligibility } from "./catalogue.mjs";
import { buildCollaborationIndex } from "./scout.mjs";
import { splitArtistNames, recordingArtistHints, searchCreditChoices } from "../public/artist-names.mjs";
import { presentationGroups, routeExplanation } from "../public/discovery-presentation.mjs";
import { buildScoutMixView, consumeMixPage } from "../public/scout-mix-session.mjs";
import { selectDiscoveries } from "../public/discovery-model.mjs";
import { isOtherArtist } from "../public/music-sorting.mjs";

export function partnerFixture(engine = { discogsReleaseGraph }) {
  const graph = { entities: {}, edges: {} }, calls = [];
  const artist = id => ({ id, name: `Performer ${id}` });
  const release = (id, ids, count = 1) => ({ id, title: `Album ${id}`, artists: ids.map(artist), year: 2024,
    tracklist: Array.from({ length: count }, (_, i) => ({ title: `Song ${id}.${i}`, type_: "track" })) });
  const merge = delta => { for (const n of delta.entities) graph.entities[n.id] = n; for (const e of delta.edges) graph.edges[`${e.from}:${e.kind}:${e.to}`] = e; };
  for (const partner of [20, 30, 40]) merge(engine.discogsReleaseGraph(release(partner, [10, partner])));
  const request = async (source, path) => {
    calls.push(path); assert.equal(source, "discogs");
    const match = path.match(/^\/artists\/(\d+)(\/releases)?$/);
    if (match && !match[2]) return artist(Number(match[1]));
    if (match) return { releases: [1, 2, 3].map(i => ({ id: Number(match[1]) * 100 + i })), pagination: { pages: 1 } };
    const id = Number(path.match(/^\/releases\/(\d+)$/)?.[1]);
    if (id) return release(id, [Math.floor(id / 100)], 10);
    throw new Error(`Unexpected fixture request ${path}`);
  };
  return { graph, calls, request, merge, seedId: "artist:discogs:10" };
}

test("collecte : trois partenaires sont échantillonnés avant un second album du premier", async () => {
  const f = partnerFixture();
  const result = await exploreCatalogueBranch({ ...f, direction: "featuring", configured: { discogs: true }, requestBudget: 12,
    minimumEligible: 6, candidateEligible: createCatalogueEligibility({ graph: f.graph, seedId: f.seedId, seedArtist: "Performer 10", otherArtistsOnly: true }), limit: 24 });
  assert.equal(new Set(result.candidates.filter(item => !item.artistIds.includes(f.seedId)).map(item => item.anchor.id)).size, 3);
  assert.ok(f.calls.length <= 12);
  assert.ok(!f.calls.includes("/releases/2002"), "pas de deuxième album tant que les trois partenaires n’ont pas eu leur premier lot");
});

test("collecte : reprise de budget sans refaire les premières requêtes", async () => {
  const f = partnerFixture(); let cursor = "", result;
  for (let i = 0; i < 5; i++) {
    result = await exploreCatalogueBranch({ ...f, direction: "featuring", cursor, configured: { discogs: true }, requestBudget: 2,
      minimumEligible: 6, candidateEligible: createCatalogueEligibility({ graph: f.graph, seedId: f.seedId, seedArtist: "Performer 10", otherArtistsOnly: true }), limit: 24 });
    assert.ok(result.coverage.fetchedRequests <= 2); f.merge(result.graphDelta); cursor = result.coverage.nextCursor;
  }
  assert.equal(new Set(f.calls).size, f.calls.length);
  assert.ok([2001, 3001, 4001].every(id => f.calls.includes(`/releases/${id}`)));
});

test("collecte : le budget par défaut rend des pistes avant de préparer tous les partenaires", async () => {
  const f = partnerFixture();
  const result = await exploreCatalogueBranch({ ...f, direction: "featuring", configured: { discogs: true }, minimumEligible: 6,
    candidateEligible: createCatalogueEligibility({ graph: f.graph, seedId: f.seedId, seedArtist: "Performer 10", otherArtistsOnly: true }), limit: 24 });
  assert.ok(result.candidates.some(item => !item.artistIds.includes(f.seedId)));
  assert.ok(f.calls.length <= 5);
  assert.deepEqual(f.calls.slice(0, 3), ["/artists/20", "/artists/20/releases", "/releases/2001"]);
});

test("crédits : séparer les personnes, garder AC/DC et ne pas créer une auto-collaboration", () => {
  assert.deepEqual(splitArtistNames("ISHA, Limsa d’Aulnay"), ["ISHA", "Limsa d’Aulnay"]);
  assert.deepEqual(splitArtistNames("AC/DC"), ["AC/DC"]);
  assert.deepEqual(recordingArtistHints("ISHA, Limsa d’Aulnay"), ["ISHA, Limsa d’Aulnay", "ISHA", "Limsa d’Aulnay"]);
  const index = buildCollaborationIndex([{ id: "v1", title: "dis-leur (feat. Jolagreen23)", channelTitle: "Uploader" }], { v1: "63KLUF & Jolagreen23 & Skuna & Reak" });
  assert.equal(index.length, 6);
  assert.ok(index.every(edge => edge.artists.every(name => !name.includes(" & ")) && new Set(edge.artists).size === 2));
  assert.equal(isOtherArtist({ artist: "ISHA & Guest" }, { name: "ISHA, Limsa d’Aulnay" }), false);
});

test("recherche : chaque crédit séparément, aucune sélection automatique, panne partielle visible", async () => {
  const queried = [];
  const result = await searchCreditChoices("Alpha, Beta", async name => {
    queried.push(name); if (name === "Beta") throw new Error("offline");
    return { candidates: [{ id: "one", name }], sourceStates: { discogs: "ok" } };
  });
  assert.deepEqual(queried, ["Alpha, Beta", "Alpha", "Beta"]);
  assert.equal(result.candidates.length, 1); assert.equal(result.sourceStates.search, "unavailable");
  assert.equal(result.confirmed, undefined);
});

const row = (id, extra = {}) => ({ id, title: "Mon cup", artist: "Deelee S & Realo", type: "track", ...extra });
test("présentation : variantes probables, identifiants contradictoires et remixes restent distingués", () => {
  const source = [row("catalogue"), row("video", { type: "video", listen: { videoId: "abcdef12345" } }), row("remix", { title: "Mon cup (remix)" })];
  const before = structuredClone(source), result = presentationGroups(source);
  assert.equal(result.groups.length, 2); assert.equal(result.groups[0].basis, "probable");
  assert.deepEqual(result.groups[0].variants.map(item => item.id), ["catalogue", "video"]);
  assert.deepEqual(source, before);
  assert.equal(presentationGroups([row("a", { isrc: "AAA" }), row("b", { isrc: "BBB" })]).groups.length, 2);
  assert.equal(presentationGroups([row("a", { isrc: "AAA" }), row("b", { isrc: "AAA" })]).groups[0].basis, "same_reference");
  assert.equal(presentationGroups([row("a", { isrc: "AAA", listen: { videoId: "same" } }), row("b", { isrc: "BBB", listen: { videoId: "same" } })]).groups.length, 2);
});

test("pagination : un morceau multisource n’occupe qu’une place et ne revient pas par son autre fiche", () => {
  const groups = { featuring: { items: [row("catalogue")] }, curator: { items: [row("video", { type: "video" })] } };
  const options = { seedId: "seed", groups, select: selectDiscoveries };
  const view = buildScoutMixView(options);
  assert.equal(view.items.length, 1); assert.equal(view.candidates, 1);
  assert.equal(view.items[0].routing.observations.length, 2);
  const history = consumeMixPage({}, view);
  assert.ok(history.seenIds.includes("video") && history.seenIds.includes("catalogue"));
  assert.equal(buildScoutMixView({ ...options, history }).items.length, 0);
});

test("présentation : les variantes d’une seule direction restent accessibles", () => {
  const view = buildScoutMixView({ seedId: "seed", groups: { label: { items: [row("one"), row("two")] } }, select: selectDiscoveries });
  assert.equal(view.items.length, 1);
  assert.deepEqual(view.items[0].presentation.ids, ["one", "two"]);
});

test("diversité : varier aussi les intermédiaires, sans bannir les pistes restantes", () => {
  const items = Array.from({ length: 8 }, (_, i) => row(`a${i}`, { title: `A${i}`, artist: `Distinct ${i}`, anchor: { id: "hub" } }));
  items.push(row("other", { title: "Other", artist: "Other", anchor: { id: "second-hub" } }));
  const view = buildScoutMixView({ seedId: "seed", groups: { featuring: { items } }, select: selectDiscoveries });
  assert.ok(view.items.slice(0, 3).some(item => item.id === "other")); assert.equal(view.candidates, 9);
});

test("explications : montrer les étapes et ne compter la période comme preuve indépendante", () => {
  const text = routeExplanation({ path: [{ from: { label: "Départ" }, to: { label: "Partenaire" } }, { from: { label: "Partenaire" }, to: { label: "Morceau" } }], evidence: [{ source: "musicbrainz" }, { source: "musicbrainz" }] }, "era");
  assert.match(text, /Départ → Partenaire → Morceau/); assert.equal(text.match(/musicbrainz/g).length, 1); assert.match(text, /pas une preuve indépendante/);
});

test("période : pas de deuxième file de priorité pour les mêmes pistes", () => {
  const direct = [row("a", { title: "A", artist: "A" }), row("b", { title: "B", artist: "B" })];
  const other = row("c", { title: "C", artist: "C" });
  const view = buildScoutMixView({ seedId: "seed", groups: { featuring: { items: direct }, era: { items: direct }, curator: { items: [other] } }, select: selectDiscoveries });
  assert.equal(view.items[1].id, "c");
  assert.ok(view.items.every(item => item.routing.selectedVia !== "era"));
  assert.ok(view.items[0].routing.observations.some(item => item.direction === "era"));
});
