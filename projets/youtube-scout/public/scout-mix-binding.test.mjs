import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { SCOUT_DIRECTIONS, createScoutPatch, setScoutParameter } from "./scout-parameters.mjs";
import { buildScoutMixView, consumeMixPage, runScoutMixLoad } from "./scout-mix-session.mjs";
import { selectDiscoveries } from "./discovery-model.mjs";
import { createDepartureProfile } from "./departure-profile.mjs";
import { WORKSPACE_DIRECTIONS } from "./workspace.mjs";
import { departureWorkflow, declaredDepartureArtist, hasExplicitDepartureArtist } from "./departure-workflow.mjs";
import { departureArtistIds } from "./music-sorting.mjs";
import { setExplorationBranchStatus } from "../lib/exploration.mjs";
import { participantResults } from "./participant-explorer.mjs";

const source = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const helpers = source.match(/\/\/ SCOUT_MIX_RACK_V1:[\s\S]*?\/\/ END_SCOUT_MIX_RACK_V1/);

function context() {
  const groups = Object.fromEntries(["label", "curator"].map(direction => [direction, {
    items: Array.from({ length: 12 }, (_, index) => ({
      id: `track:test:${direction}:${index}`, type: "track", title: `${direction} track ${index}`,
      artist: `${direction} artist ${index}`, source: "test", path: [], evidence: ["fixture"],
      listen: { kind: "search", query: `${direction} ${index}` }
    })), seenIds: [], selectedIds: [], turn: 0
  }]));
  const counters = { network: 0, persist: 0 };
  const scope = {
    departureWorkflow, setExplorationBranchStatus, hasExplicitDepartureArtist, participantResults,
    declaredDepartureArtist, departureArtistIds, seedVideo: () => null, resolvedArtist: () => null,
    selectedExplorationDirections: () => ["label", "curator"],
    EXPLORATION_DIRECTIONS: SCOUT_DIRECTIONS,
    activeDig: { seed: { id: "video:youtube:seed", label: "Seed" }, catalogueGroups: groups },
    explorationSession: { branches: [] },
    explorationGraph: { entities: {}, edges: {} },
    compositionGeneration: 7, DERIVED_SIZE: 6,
    scoutMixerRack: null, scoutMixOperation: null,
    nodes: {
      explorationDepth: { value: "6" }
    },
    document: {
      querySelector: selector =>
        selector === "#discovery-focus"
          ? { value: "breadth" }
          : null
    },
    currentJourneyGuidance: () => ({ state: "ready", directions: [] }),
    createScoutPatch, setScoutParameter, buildScoutMixView, consumeMixPage, runScoutMixLoad, selectDiscoveries, createDepartureProfile,
    fetch: () => { counters.network++; throw new Error("Unexpected network"); },
    persistExplorationSession: async () => { counters.persist++; },
    exploreWorkspaceDirection: async () => { counters.network++; }
  };
  const ctx = vm.createContext(scope);
  vm.runInContext(source.slice(source.indexOf("function confirmedSeedArtistEdges("), source.indexOf("async function rejectSeedArtistEdge(")), ctx);
  const participantHelperStart = source.indexOf("function participantSearchPool(");
  const participantHelperEnd = source.indexOf("function decodeYoutubeTitle(", participantHelperStart);
  assert.ok(participantHelperStart >= 0 && participantHelperEnd > participantHelperStart, "Le vrai lecteur des participants est inclus dans le harnais");
  vm.runInContext(source.slice(participantHelperStart, participantHelperEnd), ctx);
  assert.ok(helpers, "Les fonctions de binding doivent être réellement installées dans app.js");
  vm.runInContext(helpers[0], ctx);
  return { ctx, counters };
}

test("le registre des potards correspond aux huit directions de workspace, pas à une liste fictive", () => {
  assert.deepEqual(SCOUT_DIRECTIONS.map(row => row.id), WORKSPACE_DIRECTIONS.map(row => row[0]));
});

test("une lecture du mix ne recalcule le diagnostic du depart qu'une fois", () => {
  const { ctx } = context();
  let calls = 0;
  ctx.currentJourneyGuidance = () => { calls++; return { state: "ready", directions: [] }; };
  ctx.getScoutMixerView();
  assert.equal(calls, 1);
});

test("l’en-tête distingue les crédits complets des participants effectivement choisis", () => {
  const { ctx } = context(), seedId = ctx.activeDig.seed.id;
  ctx.explorationGraph = { entities: {
    [seedId]: { id: seedId, type: "video", departureArtist: { name: "Deen, Eff Gee, Blaz Pit", source: "user" } },
    a: { id: "a", type: "artist", name: "Deen" }, b: { id: "b", type: "artist", name: "Blaz Pit" }
  }, edges: { a: { from: seedId, to: "a", kind: "probable_artist", status: "confirmed_user" }, b: { from: seedId, to: "b", kind: "probable_artist", status: "confirmed_user" } } };
  const text = ctx.getScoutMixerView().seedContext;
  assert.match(text, /Crédits renseignés : Deen, Eff Gee, Blaz Pit/);
  assert.match(text, /Participants explorés : Deen, Blaz Pit/);
});

test("la sortie utilise le vrai selectDiscoveries puis respecte les poids", () => {
  const { ctx } = context();
  ctx.setScoutMixerParameter("direction.label.weight", .2);
  ctx.setScoutMixerParameter("direction.curator.weight", .9);
  const output = ctx.getScoutMixerView();
  assert.equal(output.items.length, 6);
  assert.equal(output.items.filter(item => item.routing.selectedVia === "curator").length, 1);
});

test("le binding d'un potard ne déclenche ni réseau, ni sauvegarde, ni consommation", () => {
  const { ctx, counters } = context();
  const before = JSON.stringify(ctx.activeDig.catalogueGroups);
  ctx.setScoutMixerParameter("direction.label.weight", 0);
  ctx.getScoutMixerView();
  assert.equal(counters.network, 0);
  assert.equal(counters.persist, 0);
  assert.equal(JSON.stringify(ctx.activeDig.catalogueGroups), before);
  assert.equal(ctx.activeDig.synthMix, undefined);
});

test("pas de départ actif : aucun réglage n'active une fouille", () => {
  const { ctx } = context(); ctx.activeDig.seed = null;
  ctx.setScoutMixerParameter("direction.label.weight", .2);
  assert.equal(ctx.activeDig.synthPatch, undefined);
  assert.equal(ctx.getScoutMixerView().items.length, 0);
});

test("les options artistes restent locales et ne consomment aucune page", () => {
  const { ctx, counters } = context();
  const before = JSON.stringify(ctx.activeDig.catalogueGroups);
  for (const parameter of ["scope.otherArtists", "scope.unknownArtists", "scope.collaborations"]) {
    ctx.setScoutMixerParameter(parameter, true);
    ctx.getScoutMixerView();
  }
  assert.equal(ctx.activeDig.synthPatch.includeUnknownArtists, true);
  assert.equal(ctx.activeDig.synthPatch.includeCollaborations, true);
  assert.deepEqual(counters, { network: 0, persist: 0 });
  assert.equal(JSON.stringify(ctx.activeDig.catalogueGroups), before);
  assert.equal(ctx.activeDig.synthMix, undefined);
});

test("les vrais résultats des participants rejoignent le mix sans devenir des crédits confirmés", () => {
  const { ctx, counters } = context();
  const item = { id: "video:youtube:participant001", type: "video", title: "Participant result", artist: "Unverified", artistIds: ["unverified"] };
  ctx.activeDig.catalogueGroups = {};
  ctx.activeDig.participantDraft = { seedId: ctx.activeDig.seed.id, launched: [
    { name: "Alice", videos: [item] },
    { name: "Bob", videos: [item] }
  ] };
  ctx.setScoutMixerParameter("scope.otherArtists", false);
  ctx.setScoutMixerParameter("scope.unknownArtists", true);
  const pool = ctx.participantSearchPool();
  assert.equal(pool.length, 1, "un même résultat reste unique pour deux participants");
  assert.deepEqual([...pool[0].participantVia], ["Alice", "Bob"]);
  assert.equal(pool[0].artist, "");
  assert.equal(pool[0].artistIds.length, 0);
  assert.match(pool[0].evidence[0], /aucun crédit confirmé/);
  const view = ctx.getScoutMixerView();
  assert.ok(view.items.some(result => result.id === item.id));
  assert.match(view.seedContext, /Alice \(sans fiche\), Bob \(sans fiche\)/);
  assert.deepEqual(counters, { network: 0, persist: 0 });
  assert.deepEqual(ctx.explorationGraph.edges, {});
});

test("un brouillon de participants non lancé ou appartenant à un autre départ reste hors du mix", () => {
  const { ctx, counters } = context();
  ctx.activeDig.catalogueGroups = {};
  const launched = [{ name: "Alice", videos: [{ id: "video:youtube:stale", type: "video", title: "Stale" }] }];
  for (const draft of [{ seedId: ctx.activeDig.seed.id }, { seedId: "other", launched }]) {
    ctx.activeDig.participantDraft = draft;
    assert.equal(ctx.participantSearchPool().length, 0);
    assert.equal(ctx.getScoutMixerView().items.length, 0);
  }
  assert.deepEqual(counters, { network: 0, persist: 0 });
});

test("activer toutes les directions conserve profondeur et diversité déjà choisies", () => {
  const { ctx, counters } = context();
  ctx.setScoutMixerParameter("shape.depth", 9);
  ctx.setScoutMixerParameter("shape.spread", .25);
  ctx.resetScoutMixerParameters();
  assert.equal(ctx.activeDig.synthPatch.shape.depth, 9);
  assert.equal(ctx.activeDig.synthPatch.shape.spread, .25);
  assert.ok(Object.values(ctx.activeDig.synthPatch.directionWeights).every(value => value === 1));
  assert.equal(counters.network, 0);
});

test("le même contrôle réactive une direction mise en pause dans une ancienne session", () => {
  const { ctx, counters } = context();
  ctx.explorationSession.branches = [{ id: "old", direction: "label", status: "paused" }];
  ctx.setScoutMixerParameter("direction.label.weight", 1);
  assert.equal(ctx.explorationSession.branches[0].status, "active");
  assert.equal(counters.network, 0);
});

test("les boutons du mix réutilisent le renderer de cartes et les gardes existants", () => {
  assert.ok(source.includes("function createScoutCatalogueCard(item, direction)"));
  assert.ok(source.includes("nodes.derivedVideos.replaceChildren()"), "La galerie historique est vidée");
  assert.ok(source.includes("renderCard: createScoutCatalogueCard"));
  assert.ok(source.includes('load: direction => exploreWorkspaceDirection(direction, { explore: true })'));
  assert.ok(source.includes("onStop: () => { cancelWorkspaceSearch(); }"));
  assert.ok(source.includes("openExploration({ seed: prior.seed, configure: true })"), "Le retour réouvre un départ frais sans réinjecter le mix précédent");
});
