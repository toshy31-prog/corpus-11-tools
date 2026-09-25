import test from "node:test";
import assert from "node:assert/strict";
import {
  DEPARTURE_KINDS,
  createDepartureProfile,
  departureCoverage,
  departureMatrix,
  normalizeDepartureKind
} from "./departure-profile.mjs";
import { SCOUT_DIRECTIONS } from "./scout-parameters.mjs";

const routeIds = SCOUT_DIRECTIONS.map(({ id }) => id);

test("V2.7: la matrice couvre exactement 4 familles × 8 directions", () => {
  const matrix = departureMatrix();
  assert.deepEqual(Object.keys(matrix), [...DEPARTURE_KINDS]);
  for (const kind of DEPARTURE_KINDS) assert.deepEqual(Object.keys(matrix[kind]), routeIds);
});

test("V2.7: une vidéo, un recording et une release restent dans la famille morceau", () => {
  for (const type of ["track", "video", "recording", "release", "release_group", "master"]) {
    assert.equal(normalizeDepartureKind({ type }), "track");
  }
});

test("V2.7: le morceau garde CURATOR direct et les autres voies médiées", () => {
  const p = createDepartureProfile({ id: "video:youtube:x", type: "track" });
  assert.equal(p.routes.curator.mode, "direct");
  assert.equal(p.routes.curator.implementation, "implemented");
  for (const id of routeIds.filter(id => id !== "curator")) assert.equal(p.routes[id].mode, "mediated");
});

test("V2.7: ERA n'utilise jamais la date d'upload comme preuve musicale", () => {
  for (const kind of DEPARTURE_KINDS) {
    const p = createDepartureProfile({ id: `${kind}:test`, type: kind });
    assert.equal(p.routes.era.releaseDateEvidenceOnly, true);
    assert.doesNotMatch(p.routes.era.via, /upload/i);
  }
});

test("V2.7: l'artiste distingue les voies déjà câblées des gaps d'orchestration et de source", () => {
  const p = createDepartureProfile({ id: "artist:discogs:10", type: "artist", externalIds: { discogs: "10" } });
  for (const id of ["label", "remix", "featuring", "compilation", "alias"]) assert.equal(p.routes[id].implementation, "implemented");
  assert.equal(p.routes.scene.implementation, "orchestration_gap");
  assert.equal(p.routes.era.implementation, "orchestration_gap");
  assert.equal(p.routes.curator.implementation, "source_gap");
});

test("V2.7: un label ne recycle jamais ALIAS pour signifier imprint ou sous-label", () => {
  const p = createDepartureProfile({ id: "label:discogs:77", type: "label", externalIds: { discogs: "77" } });
  assert.equal(p.routes.label.mode, "direct");
  assert.equal(p.routes.alias.mode, "not_applicable");
  assert.equal(p.routes.alias.implementation, "not_applicable");
  assert.match(p.routes.alias.via, /artistes/);
});

test("V2.7: une playlist est un corpus agrégé, pas un morceau géant", () => {
  const p = createDepartureProfile({ id: "playlist:youtube:p", type: "playlist" });
  assert.ok(routeIds.every(id => p.routes[id].mode === "aggregate"));
  assert.equal(p.routes.curator.implementation, "implemented_local");
  assert.equal(p.routes.era.implementation, "orchestration_gap");
});

test("V2.7: chaque voie reste routing-only et le bootstrap ne consomme pas DEPTH", () => {
  for (const kind of DEPARTURE_KINDS) {
    const p = createDepartureProfile({ id: `${kind}:test`, type: kind });
    for (const route of Object.values(p.routes)) {
      assert.equal(route.evidenceAuthority, false);
      assert.equal(route.explicitDigOnly, true);
      assert.equal(route.bootstrapCountsAsDepth, false);
    }
  }
});

test("V2.7: la couverture initiale ne confond jamais faisabilité et exhaustivité", () => {
  for (const kind of ["playlist", "label"]) {
    const coverage = departureCoverage({ id: `${kind}:test`, type: kind });
    for (const row of Object.values(coverage)) {
      assert.notEqual(row.state, "complete");
      assert.equal(row.complete, false);
    }
  }
});

test("V2.7: ERA playlist exige un bootstrap des membres au lieu de déclarer l'époque complète", () => {
  const coverage = departureCoverage({ id: "playlist:youtube:p", type: "playlist" });
  assert.equal(coverage.era.state, "partial");
  assert.ok(coverage.era.pending.includes("analyse_playlist_members"));
});

test("V2.7: le contexte détecte une identité fournisseur exacte et les membres d'une playlist", () => {
  const graph = {
    entities: {
      "label:discogs:77": { id: "label:discogs:77", type: "label", externalIds: { discogs: "77" } },
      "playlist:youtube:p": { id: "playlist:youtube:p", type: "playlist" },
      "video:youtube:v": { id: "video:youtube:v", type: "video" }
    },
    edges: {
      member: { from: "video:youtube:v", to: "playlist:youtube:p", kind: "included_in", status: "observed" }
    }
  };
  assert.equal(createDepartureProfile({ id: "label:discogs:77", type: "label" }, { graph }).context.catalogueIdentity, true);
  assert.equal(createDepartureProfile({ id: "playlist:youtube:p", type: "playlist" }, { graph }).context.playlistMembers, 1);
});
