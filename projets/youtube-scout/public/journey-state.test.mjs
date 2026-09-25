import test from "node:test";
import assert from "node:assert/strict";
import { branchGuidance, collaborationContext, journeyGuidance } from "./journey-state.mjs";

const seed = { id: "video:youtube:video001", type: "video", label: "Art of Tones - Violation" };
const artist = { id: "artist:discogs:100", type: "artist", name: "Art of Tones", externalIds: { discogs: "100" } };
const probable = { from: seed.id, to: artist.id, kind: "probable_artist", status: "candidate" };
const candidate = { id: artist.id, name: artist.name, source: "discogs", sourceId: "100" };
const graph = { entities: { [artist.id]: artist }, edges: { probable } };

test("la confirmation commune est dédupliquée et prioritaire sans bloquer la chaîne-curatrice", () => {
  const groups = {
    label: { confirmationCandidates: [candidate], coverage: { state: "needs_confirmation" } },
    remix: { confirmationCandidates: [candidate], coverage: { state: "needs_confirmation" } },
    curator: { loading: true, items: [{ id: "video:youtube:other" }], selectedIds: ["video:youtube:other"] }
  };
  const journey = journeyGuidance({ seed, groups, graph });
  assert.equal(journey.state, "needs_confirmation");
  assert.equal(journey.candidates.length, 1);
  assert.deepEqual(journey.directions, ["label", "remix"]);
  assert.deepEqual(journey.candidates[0].directions, ["label", "remix"]);
  assert.equal(branchGuidance({ direction: "label", status: "unexplored" }, groups.label, journey).state, "needs_confirmation");
  assert.equal(branchGuidance({ direction: "curator", status: "active" }, groups.curator, journey).state, "loading");
  groups.curator.loading = false;
  assert.equal(branchGuidance({ direction: "curator", status: "unexplored" }, groups.curator, journey).state, "ready");
});

test("un ancien parcours récupère une confirmation directe à ID réel, pas un nom local ni une identité indirecte", () => {
  const local = { id: "artist:local:art-of-tones", type: "artist", name: artist.name };
  const foreign = { id: "artist:discogs:200", type: "artist", name: "Autre artiste", externalIds: { discogs: "200" } };
  const input = {
    seed, groups: { label: { coverage: { state: "not_checked" } }, curator: {} },
    graph: {
      entities: [artist, local, foreign],
      edges: [probable, { ...probable, to: local.id }, { ...probable, from: "other-seed", to: foreign.id }]
    }
  };
  const snapshot = structuredClone(input);
  const journey = journeyGuidance(input);
  assert.equal(journey.state, "needs_confirmation");
  assert.deepEqual(journey.candidates.map(({ id }) => id), [artist.id]);
  assert.deepEqual(journey.directions, ["label"]);
  assert.deepEqual(input, snapshot, "Lire la guidance ne confirme, ne fusionne et ne modifie rien.");
});

test("la confirmation explicite rend caducs les candidats sauvegardés sans prétendre que leur catalogue est épuisé", () => {
  for (const status of ["confirmed_user", "confirmed_cross_id", "corroborated"]) {
    const group = { confirmationCandidates: [candidate], coverage: { state: "needs_confirmation" } };
    const journey = journeyGuidance({ seed, groups: { label: group }, graph: { entities: graph.entities, edges: [{ ...probable, status },
      ...(status === "confirmed_user" ? [] : [
        { from: seed.id, to: "recording:exact", kind: "embodies", status: "resolved" },
        { from: artist.id, to: "recording:exact", kind: "credited_on", status: "observed" }
      ])] } });
    assert.equal(journey.identityConfirmed, true);
    assert.equal(journey.candidates.length, 0);
    assert.equal(journey.state, "needs_enrichment");
    assert.equal(branchGuidance({ direction: "label", status: "exhausted" }, group, journey).state, "needs_enrichment");
  }
});

test("une relation confirmée d’un autre départ ne supprime pas la confirmation du départ actuel", () => {
  const journey = journeyGuidance({ seed, groups: { label: { confirmationCandidates: [candidate] } }, graph: { entities: graph.entities, edges: [{ ...probable, from: "other-seed", status: "confirmed_user" }] } });
  assert.equal(journey.state, "needs_confirmation");
  assert.equal(journey.identityConfirmed, false);
});

test("une graine artiste de catalogue est directement exploitable, une simple homonymie locale ne l’est pas", () => {
  const groups = { label: { confirmationCandidates: [candidate] } };
  assert.equal(journeyGuidance({ seed: { ...artist, label: artist.name }, groups, graph }).identityConfirmed, true);
  const local = { id: "artist:local:art-of-tones", type: "artist", label: artist.name };
  assert.equal(journeyGuidance({ seed: local, groups, graph }).identityConfirmed, false);
});

test("les états personnels de branche passent avant les relances et prérequis", () => {
  const journey = { state: "needs_confirmation", directions: ["label"] };
  for (const status of ["paused", "explored", "dismissed"]) {
    assert.equal(branchGuidance({ direction: "label", status }, { loading: true }, journey).state, status);
  }
});

test("une branche encore inconnue est prête dès que son catalogue contient des pistes", () => {
  const guidance = branchGuidance({ direction: "label", status: "unexplored", current: null }, { items: [{ id: "release:discogs:1" }] }, { state: "ready" });
  assert.equal(guidance.state, "ready");
  assert.match(guidance.message, /ci-dessous/);
});

test("une source en panne ou une couverture partielle ne deviennent jamais une branche épuisée", () => {
  const branch = { direction: "label", status: "exhausted" };
  assert.equal(branchGuidance(branch, { error: "429", coverage: { complete: false } }).state, "source_unavailable");
  assert.equal(branchGuidance(branch, { coverage: { state: "partial", complete: false } }).state, "needs_enrichment");
  assert.equal(branchGuidance(branch, { coverage: { state: "not_documented", complete: true, hasMore: false } }).state, "exhausted");
});

test("des catalogues entièrement consultés et vides n’invitent pas à les enrichir indéfiniment", () => {
  const group = { items: [], selectedIds: [], coverage: { state: "not_documented", complete: true, hasMore: false } };
  const journey = journeyGuidance({ seed, groups: { label: group, remix: group }, graph });
  assert.equal(journey.state, "ready");
  assert.equal(journey.candidates.length, 0);
  assert.match(journey.message, /Changez de départ/);
});

test("les identifiants factices et les directions indépendantes ne déclenchent pas une confirmation", () => {
  const groups = { label: { confirmationCandidates: [{ ...candidate, id: "artist:local:100", sourceId: "x" }] }, curator: { confirmationCandidates: [candidate], items: [{ id: "ready" }] } };
  const journey = journeyGuidance({ seed, groups, graph: {} });
  assert.equal(journey.candidates.length, 0);
  assert.equal(journey.state, "ready");
});

test("un atlas de 698 liens n’affiche que le lien du contexte, jamais les 697 autres", () => {
  const unrelated = Array.from({ length: 697 }, (_, index) => ({ artists: [`Artist ${index}`, `Partner ${index}`], artistKeys: [`artist${index}`, `partner${index}`] }));
  const related = { artists: ["Art of Tones", "Nicolas Felices"], artistKeys: ["artoftones", "nicolasfelices"] };
  const index = [...unrelated, related];
  assert.deepEqual(collaborationContext({ seed, index }).edges, []);
  assert.deepEqual(collaborationContext({ seed: null, artistName: "Art of Tones", index }).edges, []);
  assert.deepEqual(collaborationContext({ seed, localArtistName: "Àrt of Tones", index }).edges, [related]);
  assert.deepEqual(collaborationContext({ seed: { id: artist.id, type: "artist", label: "Art of Tones" }, index }).edges, [related]);
});

test("un nom absent ou une graine de label ne devient pas un artiste ; la normalisation garde les lettres Unicode", () => {
  const index = [{ artists: ["坂本 龍一", "Alva Noto"] }];
  assert.deepEqual(collaborationContext({ seed: { id: "label:discogs:1", type: "label", label: "坂本 龍一" }, index }).edges, []);
  assert.deepEqual(collaborationContext({ seed, artistName: "坂本 龍一", index }).edges, index);
  assert.equal(collaborationContext({ seed, artistName: "!!!", index }).activeKey, "");
});

test("playlist and label guidance ignores stale song identity state and artist candidates", () => {
  for (const type of ["playlist", "label", "channel"]) {
    const journey = journeyGuidance({ seed: { id: `${type}:local:collection`, type, label: "Collection" },
      dossier: { state: "partial", suppressWeakIdentityCandidates: true }, groups: { label: { confirmationCandidates: [candidate] } }, graph });
    assert.equal(journey.state, "needs_enrichment");
    assert.deepEqual(journey.candidates, []);
    assert.doesNotMatch(journey.message, /Confirmez l’artiste|identifié ce morceau/);
    assert.equal(journey.departureType, type);
  }
});

test("catalogue ID selected by the user remains recognized before a graph refresh", () => {
  const selected = { id: "artist:discogs:60", type: "artist", label: "6SISS", externalIds: { discogs: "60" } };
  const journey = journeyGuidance({ seed: selected, graph: { entities: { [selected.id]: { id: selected.id, type: "artist", name: selected.label } } } });
  assert.equal(journey.identityConfirmed, true);
  assert.deepEqual(journey.candidates, []);
  assert.equal(journeyGuidance({ seed: { id: "artist:local:6siss", type: "artist", label: "6SISS" } }).identityConfirmed, false);
});
