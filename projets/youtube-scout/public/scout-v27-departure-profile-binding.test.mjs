import test from "node:test";
import assert from "node:assert/strict";
import { createDepartureProfile } from "./departure-profile.mjs";
import { buildScoutMixView } from "./scout-mix-session.mjs";

const item = id => ({ id, title: id, artist: "A" });
const select = (items, { exclude = [], limit = 99 } = {}) => items.filter(row => !exclude.includes(row.id)).slice(0, limit);

test("V2.7 binding: une voie N/A ne charge ni ne contribue au mix", () => {
  const profile = createDepartureProfile({ id: "label:discogs:77", type: "label", externalIds: { discogs: "77" } });
  const view = buildScoutMixView({
    seedId: "label:discogs:77",
    groups: { alias: { items: [item("alias-should-not-leak")] } },
    routePlans: profile.routes,
    select
  });
  const alias = view.routes.find(route => route.id === "alias");
  assert.equal(alias.state, "n/a");
  assert.equal(alias.enabled, false);
  assert.equal(alias.canLoad, false);
  assert.equal(view.items.some(row => row.id === "alias-should-not-leak"), false);
});

test("V2.7 binding: un source_gap est visible comme non câblé sans requête implicite", () => {
  const profile = createDepartureProfile({ id: "artist:discogs:10", type: "artist", externalIds: { discogs: "10" } });
  const view = buildScoutMixView({ seedId: "artist:discogs:10", groups: {}, routePlans: profile.routes, select });
  const curator = view.routes.find(route => route.id === "curator");
  assert.equal(curator.state, "unsupported");
  assert.equal(curator.canLoad, false);
});

test("V2.7 binding: un gap d'orchestration reste explicitement DIG-able", () => {
  const profile = createDepartureProfile({ id: "playlist:youtube:p", type: "playlist" });
  const view = buildScoutMixView({ seedId: "playlist:youtube:p", groups: {}, routePlans: profile.routes, select });
  const era = view.routes.find(route => route.id === "era");
  assert.equal(era.state, "mediated");
  assert.equal(era.canLoad, true);
  assert.equal(era.plan.implementation, "orchestration_gap");
});
