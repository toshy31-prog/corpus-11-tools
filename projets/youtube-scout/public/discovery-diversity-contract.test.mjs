import test from "node:test";
import assert from "node:assert/strict";
import { SCOUT_DIRECTIONS } from "./scout-parameters.mjs";
import { buildScoutMixView, consumeMixPage } from "./scout-mix-session.mjs";
import { selectDiscoveries } from "./discovery-model.mjs";

// SYNTHETIC contract fixtures, not human relevance or listening judgments.
const fixture = () => Object.fromEntries(SCOUT_DIRECTIONS.map(({ id }) => [id, {
  items: Array.from({ length: 12 }, (_, i) => ({
    id: `${id}-${i}`, title: `Synthetic ${id} ${i}`, artist: `Artist ${id} ${i}`,
    artistIds: [`artist-${id}-${i}`], status: "candidate", path: [],
    evidence: [{ source: "synthetic-contract" }]
  }))
}]));

test("SYNTHETIC: huit directions, budget identique, couverture sans promotion de preuve", () => {
  const groups = fixture(), before = structuredClone(groups);
  let history = {}, calls = 0;
  const output = [];
  for (let page = 0; page < 4; page++) {
    const view = buildScoutMixView({ seedId: "synthetic-seed", groups, history, limit: 6,
      patch: { sort: "explore", shape: { spread: 1 } },
      select: (...args) => { calls++; return selectDiscoveries(...args); }
    });
    assert.equal(view.items.length, 6);
    output.push(...view.items);
    history = consumeMixPage(history, view);
  }
  const baseline = Object.values(groups).flatMap(group => group.items).slice(0, 24);
  assert.equal(new Set(output.map(item => item.routing.selectedVia)).size, 8);
  assert.equal(new Set(baseline.map(item => item.id.split("-")[0])).size, 2);
  assert.equal(new Set(output.map(item => item.id)).size, 24);
  assert.equal(new Set(output.flatMap(item => item.artistIds)).size, 24);
  assert.equal(calls, 32, "un appel local par direction et page, sans nouvel accès source");
  for (const item of output) {
    assert.equal(item.status, "candidate");
    assert.deepEqual(item.evidence, [{ source: "synthetic-contract" }]);
    assert.equal("confidence" in item, false);
  }
  assert.deepEqual(groups, before);
});

test("SYNTHETIC: diversification ne réactive jamais une direction exclue et le focus reste souverain", () => {
  const groups = fixture();
  for (const disabled of SCOUT_DIRECTIONS) {
    const view = buildScoutMixView({ seedId: "synthetic-seed", groups, limit: 12,
      patch: { directionWeights: { [disabled.id]: 0 }, shape: { spread: 1 } }, select: selectDiscoveries });
    assert.ok(view.items.length > 0);
    assert.ok(view.items.every(item => item.routing.selectedVia !== disabled.id));
  }
  for (const route of SCOUT_DIRECTIONS) {
    const view = buildScoutMixView({ seedId: "synthetic-seed", groups, limit: 6,
      directionFilter: route.id, patch: { shape: { spread: 1 } }, select: selectDiscoveries });
    assert.equal(view.items.length, 6);
    assert.ok(view.items.every(item => item.routing.selectedVia === route.id));
  }
});
