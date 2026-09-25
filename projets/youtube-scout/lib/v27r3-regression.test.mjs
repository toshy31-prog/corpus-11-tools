import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

import { directionAnchors, graphIndex } from "./catalogue-graph.mjs";
import { collaborationContext, journeyGuidance } from "../public/journey-state.mjs";
import { declaredDepartureArtist } from "../public/departure-workflow.mjs";
import { splitArtistNames } from "../public/artist-names.mjs";
import { artistCollaborationProfile } from "./scout.mjs";

function graph(entities, edges) {
  return {
    entities: Object.fromEntries(entities.map((x) => [x.id, x])),
    edges: Object.fromEntries(edges.map((x, i) => [String(i), x]))
  };
}

test("V2.7R3: les labels placeholders ne deviennent pas des ancres de routage", () => {
  for (const name of ["[no label]", "No Label", "Not On Label"]) {
    const state = graph(
      [
        { id: "v", type: "video", title: "Seed" },
        { id: "a", type: "artist", name: "Artist" },
        { id: "r", type: "release", title: "Release" },
        { id: "l", type: "label", name }
      ],
      [
        { from: "v", to: "a", kind: "probable_artist", status: "confirmed_user" },
        { from: "a", to: "r", kind: "primary_artist", status: "observed" },
        { from: "r", to: "l", kind: "issued_by", status: "observed" }
      ]
    );
    assert.equal(directionAnchors(graphIndex(state), "v", "label").anchors.has("l"), false, name);
  }
});

test("V2.7R3: un vrai label reste routable", () => {
  const state = graph(
    [
      { id: "v", type: "video", title: "Seed" },
      { id: "a", type: "artist", name: "Artist" },
      { id: "r", type: "release", title: "Release" },
      { id: "l", type: "label", name: "Mechatronica" }
    ],
    [
      { from: "v", to: "a", kind: "probable_artist", status: "confirmed_user" },
      { from: "a", to: "r", kind: "primary_artist", status: "observed" },
      { from: "r", to: "l", kind: "issued_by", status: "observed" }
    ]
  );
  assert.equal(directionAnchors(graphIndex(state), "v", "label").anchors.has("l"), true);
});

test("V2.7R3: rejected_user n'est plus une identité ni un candidat à reconfirmer", () => {
  const seed = { id: "video:seed", type: "track", label: "Seed" };
  const artist = {
    id: "artist:musicbrainz:11111111-1111-1111-1111-111111111111",
    type: "artist",
    name: "Wrong Artist",
    externalIds: { musicbrainz: "11111111-1111-1111-1111-111111111111" }
  };
  const state = graph(
    [artist],
    [{
      from: seed.id,
      to: artist.id,
      kind: "probable_artist",
      status: "rejected_user",
      evidence: ["user_rejection"]
    }]
  );
  const guidance = journeyGuidance({
    seed,
    graph: state,
    groups: { label: { coverage: { state: "not_checked", complete: false } } }
  });
  assert.equal(guidance.identityConfirmed, false);
  assert.deepEqual(guidance.candidates, []);
});

test("V2.7R3: l'atlas peut couper le fallback textuel quand R1 est indécis", () => {
  const seed = { id: "video:seed", type: "track", label: '"Time Travel" - Nexxor' };
  const index = [{ artists: ["Time Travel", "Partner"], artistKeys: ["timetravel", "partner"] }];

  assert.equal(
    collaborationContext({
      seed,
      localArtistName: "Time Travel",
      suppressLocalArtist: true,
      index
    }).artistName,
    ""
  );

  assert.equal(
    collaborationContext({
      seed,
      localArtistName: "Time Travel",
      suppressLocalArtist: false,
      index
    }).artistName,
    "Time Travel"
  );
});

test("V2.7R3 contract: révocation explicite, protection et action UI", async () => {
  const store = readFileSync(new URL("./persistent-store.mjs", import.meta.url), "utf8");
  const app = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
  const catalogue = readFileSync(new URL("./catalogue-graph.mjs", import.meta.url), "utf8");

  assert.match(store, /incoming\.status === "rejected_user"/);
  assert.match(store, /user_rejection/);
  assert.match(store, /previous\.status === "rejected_user"/);
  assert.match(catalogue, /"rejected_user"/);
  assert.match(catalogue, /isRoutingLabel/);
  assert.match(app, /async function rejectSeedArtistEdge/);
  assert.match(app, /Ce n’est pas cet artiste/);
  assert.match(app, /status: "rejected_user"/);
  // Exercise the current revocation-to-render path instead of requiring an
  // obsolete property name in the source. A revoked identity must not return
  // through the title-derived fallback, while explicit user credits survive.
  function actualFunction(name) {
    const start = app.search(new RegExp(`^(?:async )?function ${name}\\(`, "m"));
    assert.ok(start >= 0, `${name} existe dans le frontend`);
    const next = app.slice(start + 1).search(/\n(?:async )?function /);
    assert.ok(next >= 0, `Limite de ${name} trouvée`);
    return app.slice(start, start + 1 + next);
  }
  class Element {
    constructor() { this.children = []; this.textContent = ""; }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = [...children]; }
    querySelector() { return new Element(); }
  }
  const seed = { id: "video:seed", type: "video", label: "Wrong Artist - Track" };
  const edge = { from: seed.id, to: "artist:wrong", kind: "probable_artist", status: "confirmed_user", evidence: ["user_confirmation"] };
  const state = graph([{ ...seed, title: seed.label }, { id: edge.to, type: "artist", name: "Wrong Artist" }], [edge]);
  const title = new Element(), requests = [], reopened = [];
  const context = vm.createContext({
    activeDig: { seed, catalogueGroups: { stale: {} }, dossier: { artistName: "Wrong Artist" } },
    explorationGraph: state, compositionGeneration: 1, catalogueRequests: new Map(),
    explorationSession: {}, currentDerivedIds: ["stale"], collaborationDisplay: { key: "", limit: 6 },
    collaborationIndex: [{ artists: ["Wrong Artist", "Partner"], artistKeys: ["wrongartist", "partner"], count: 1, kinds: {}, examples: [{ id: "fixture", title: "Credit" }] }],
    declaredDepartureArtist, splitArtistNames, collaborationContext, artistCollaborationProfile,
    seedVideo: () => ({ id: "seed" }), resolvedArtist: () => ({ name: "Wrong Artist" }), escapeHtml: String,
    nodes: { collaborations: new Element(), collaborationEdges: new Element(), collaborationSummary: new Element() },
    document: { querySelector: () => title, createElement: () => new Element() },
    fetch: async (url, options) => { requests.push({ url, body: JSON.parse(options.body) }); return { ok: true }; },
    recordFeedback: async () => {},
    refreshExplorationGraph: async () => { state.edges[0] = { ...state.edges[0], ...requests.at(-1).body.edges[0] }; },
    renderActiveSeed() {}, renderCatalogueGroups() {},
    openExploration: async options => { reopened.push(options); }
  });
  vm.runInContext(["entityTokens", "collaborationKinds", "confirmedSeedArtistEdges", "rejectSeedArtistEdge", "renderCollaborationAtlas"].map(actualFunction).join("\n"), context);
  context.renderCollaborationAtlas();
  assert.equal(title.textContent, "Collaborateurs de Wrong Artist");
  assert.ok(context.nodes.collaborationSummary.children.length > 0);
  await context.rejectSeedArtistEdge(edge, seed.id);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "/api/graph/ingest");
  assert.equal(requests[0].body.edges[0].status, "rejected_user");
  assert.ok(requests[0].body.edges[0].evidence.includes("user_rejection"));
  assert.equal(context.confirmedSeedArtistEdges(seed.id).length, 0);
  assert.equal(title.textContent, "Collaborateurs du départ");
  assert.equal(context.nodes.collaborationSummary.children.length, 0);
  assert.equal(reopened.length, 1);
  assert.equal(reopened[0].seed.id, seed.id);
  state.entities[seed.id].departureArtist = { name: "Partner", source: "user" };
  context.renderCollaborationAtlas();
  assert.equal(title.textContent, "Collaborateurs de Partner", "la suppression d'une hypothèse conserve les crédits explicites");
});
