import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { journeyGuidance } from "../public/journey-state.mjs";
import { departureRevision } from "../public/departure-integrity.mjs";
import { MANUAL_DEPARTURE_EVIDENCE, typedDepartureModel, localDepartureMembers, declaredDepartureArtist, artistChoiceRank } from "../public/departure-workflow.mjs";
import { guessArtist } from "./scout.mjs";
import { splitArtistNames } from "../public/artist-names.mjs";

const app = await readFile(new URL("../public/app.js", import.meta.url), "utf8");

function actualFunction(name) {
  const pattern = new RegExp(`^(?:async )?function ${name}\\(`, "m");
  const start = app.search(pattern);
  assert.ok(start >= 0, `${name} existe dans le vrai frontend`);
  const rest = app.slice(start + 1);
  const next = rest.search(/\n(?:async )?function /);
  assert.ok(next >= 0, `Limite de ${name} trouvée`);
  return app.slice(start, start + 1 + next);
}

// A deliberately small DOM surface: the real rendering function must create
// its controls and wire their actual handlers. No browser data/network is used.
class Element {
  constructor(tag = "div") { this.tagName = tag; this.children = []; this.controls = new Map(); this.innerHTML = ""; }
  replaceChildren(...children) { this.children = [...children]; }
  append(...children) { this.children.push(...children); }
  querySelector(selector) {
    const attribute = selector.match(/^\[([^\]]+)\]$/)?.[1];
    if (!attribute || !this.innerHTML.includes(attribute)) return null;
    if (!this.controls.has(selector)) this.controls.set(selector, new Element("button"));
    return this.controls.get(selector);
  }
}

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

function fixture({ fetch, refresh, label = "Violation" } = {}) {
  // No artist hint: this exercises the generic candidate-confirmation path.
  // A named recording now uses the participant picker, covered separately below.
  const seed = { id: "video:youtube:video001", type: "video", label };
  const artist = { id: "artist:discogs:100", type: "artist", name: "Art of Tones", externalIds: { discogs: "100" } };
  const candidate = { id: artist.id, name: artist.name, source: "discogs", sourceId: "100" };
  const group = { items: [], confirmationCandidates: [candidate], coverage: { state: "needs_confirmation" } };
  const host = new Element("div");
  const requests = [];
  const refreshes = [];
  const openings = [];
  const corrections = [];
  const context = {
    departureRevision,
    journeyGuidance,
    typedDepartureModel,
    localDepartureMembers,
    declaredDepartureArtist, artistChoiceRank, guessArtist, splitArtistNames,
    artistCorrections: {},
    library: [],
    seedVideo: () => null,
    MANUAL_DEPARTURE_EVIDENCE,
    renderArtistCorrection: (host, seedId) => { corrections.push({ host, seedId }); }, // Full form exercised in workflow-browser-audit.
    cancelWorkspaceSearch: () => {},
    activeDig: { seed, catalogueGroups: { label: group } },
    explorationGraph: { entities: { [seed.id]: { id: seed.id, type: "video", title: seed.label }, [artist.id]: artist }, edges: [{ from: seed.id, to: artist.id, kind: "probable_artist", status: "candidate" }] },
    explorationSession: { lineage: [{ id: "kept-step" }] },
    compositionGeneration: 1,
    nodes: { explorationState: {} },
    document: { querySelector: selector => selector === "#seed-action" ? host : null, createElement: tag => new Element(tag) },
    escapeHtml: String,
    safeExternalUrl: value => /^https:\/\//.test(value) ? value : "",
    evidenceLabel: value => value,
    fetch: async (url, options) => { requests.push({ url, options }); return fetch ? fetch(url, options) : { ok: true }; },
    refreshExplorationGraph: async id => { refreshes.push(id); if (refresh) await refresh(id); },
    openExploration: async options => { openings.push(options); }
  };
  vm.createContext(context);
  vm.runInContext(["resolvedArtist", "participantProposalMatches", "disputedSeedArtistIds", "currentJourneyGuidance", "confirmSeedArtist", "renderSeedGuidance"].map(actualFunction).join("\n"), context);
  const renderedCandidateRow = () => host.children[0].children[0].children[0];
  return { context, seed, artist, candidate, group, host, requests, refreshes, openings, corrections, renderedCandidateRow };
}

test("un artiste déjà suggéré est confié au sélecteur de participants sans seconde confirmation", () => {
  const view = fixture({ label: "Art of Tones - Violation" });
  view.context.renderSeedGuidance();
  const choices = view.host.children[0].children[0];
  assert.equal(choices.children.some(row => row.querySelector("[data-confirm-artist]")), false);
  assert.deepEqual(view.corrections.map(item => item.seedId), [view.seed.id]);
  assert.equal(view.requests.length, 0);
  assert.equal(view.openings.length, 0);
  assert.equal(view.context.explorationGraph.edges[0].status, "candidate");
});

test("le vrai résolveur lit une correction personnelle sans confirmer de relation catalogue", () => {
  const view = fixture();
  view.context.artistCorrections.video001 = "Art of Tones";
  assert.equal(view.context.resolvedArtist({ id: "video001" }).name, "Art of Tones");
  assert.equal(view.context.resolvedArtist({ id: "video001" }).basis, "correction personnelle");
  assert.equal(view.requests.length, 0);
  assert.equal(view.context.explorationGraph.edges[0].status, "candidate");
});

test("rendre une confirmation restaurée ne l’exécute pas automatiquement", () => {
  const view = fixture();
  view.context.renderSeedGuidance();
  assert.equal(view.host.hidden, false);
  assert.match(view.host.children[0].innerHTML, /Confirmez l’artiste/);
  assert.equal(typeof view.renderedCandidateRow().querySelector("[data-confirm-artist]").onclick, "function");
  assert.equal(view.requests.length, 0);
  assert.equal(view.openings.length, 0);
  assert.equal(view.context.explorationGraph.edges[0].status, "candidate");
});

test("seul le clic de confirmation rend la relation confirmed_user puis reprend le départ", async () => {
  const view = fixture();
  view.context.renderSeedGuidance();
  const button = view.renderedCandidateRow().querySelector("[data-confirm-artist]");
  await button.onclick({ currentTarget: button });
  assert.equal(view.requests.length, 1);
  assert.equal(view.requests[0].url, "/api/graph/ingest");
  assert.equal(view.requests[0].options.method, "POST");
  assert.deepEqual(JSON.parse(view.requests[0].options.body), { entities: [{ id: view.seed.id, type: "video", title: view.seed.label }, view.artist], edges: [{ from: view.seed.id, to: view.artist.id, kind: "probable_artist", status: "confirmed_user", departureRevision: "", evidence: ["user_confirmation", MANUAL_DEPARTURE_EVIDENCE] }] });
  assert.deepEqual(view.refreshes, [view.seed.id]);
  assert.equal(view.openings.length, 1);
  assert.equal(view.openings[0].seed.id, view.seed.id);
  assert.equal(view.openings[0].preserveLineage, true);
  assert.equal(view.group.confirmationCandidates.length, 0);
});

test("explorer la fiche proposée ne confirme pas implicitement l’artiste du morceau", async () => {
  const view = fixture();
  view.context.renderSeedGuidance();
  await view.renderedCandidateRow().querySelector("[data-explore-artist]").onclick();
  assert.equal(view.requests.length, 0);
  assert.equal(view.openings.length, 1);
  assert.equal(view.openings[0].seed.id, view.artist.id);
  assert.equal(view.openings[0].seed.type, "artist");
  assert.equal(view.context.explorationGraph.edges[0].status, "candidate");
});

test("une graine périmée ou un candidat non présenté ne déclenchent aucune écriture", async () => {
  const view = fixture();
  await view.context.confirmSeedArtist(view.candidate, "video:youtube:other");
  await view.context.confirmSeedArtist({ ...view.candidate, id: "artist:discogs:999" }, view.seed.id);
  assert.equal(view.requests.length, 0);
  assert.equal(view.openings.length, 0);
});

test("un ancien bouton affiché ne confirme pas un candidat pour la nouvelle graine", async () => {
  const view = fixture();
  view.context.renderSeedGuidance();
  const button = view.renderedCandidateRow().querySelector("[data-confirm-artist]");
  view.context.activeDig = { seed: { id: "video:youtube:new-seed" }, catalogueGroups: {} };
  await button.onclick({ currentTarget: button });
  assert.equal(view.requests.length, 0);
  assert.equal(view.openings.length, 0);
});

test("un échec d’enregistrement ne supprime pas le choix ni ne poursuit le parcours", async () => {
  const view = fixture({ fetch: async () => ({ ok: false }) });
  await assert.rejects(view.context.confirmSeedArtist(view.candidate, view.seed.id), /n’a pas été enregistrée/);
  assert.equal(view.group.confirmationCandidates.length, 1);
  assert.equal(view.refreshes.length, 0);
  assert.equal(view.openings.length, 0);
});

test("changer de départ pendant le POST de confirmation empêche la réouverture de l’ancienne graine", async () => {
  const pending = deferred();
  const started = deferred();
  const view = fixture({ fetch: () => { started.resolve(); return pending.promise; } });
  const confirming = view.context.confirmSeedArtist(view.candidate, view.seed.id);
  await started.promise;
  view.context.compositionGeneration += 1;
  view.context.activeDig = { seed: { id: "video:youtube:new-seed" }, catalogueGroups: { label: { marker: "new" } } };
  pending.resolve({ ok: true });
  await confirming;
  assert.equal(view.refreshes.length, 0);
  assert.equal(view.openings.length, 0);
  assert.equal(view.context.activeDig.catalogueGroups.label.marker, "new");
});

test("changer de départ pendant la relecture du graphe protège aussi les nouveaux groupes", async () => {
  const pending = deferred();
  const started = deferred();
  const view = fixture({ refresh: () => { started.resolve(); return pending.promise; } });
  const confirming = view.context.confirmSeedArtist(view.candidate, view.seed.id);
  await started.promise;
  view.context.compositionGeneration += 1;
  view.context.activeDig = { seed: { id: "video:youtube:new-seed" }, catalogueGroups: { label: { marker: "new", confirmationCandidates: ["retain"] } } };
  pending.resolve();
  await confirming;
  assert.equal(view.openings.length, 0);
  assert.deepEqual(view.context.activeDig.catalogueGroups.label.confirmationCandidates, ["retain"]);
});
