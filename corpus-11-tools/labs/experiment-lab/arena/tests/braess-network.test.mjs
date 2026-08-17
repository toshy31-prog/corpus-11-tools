import assert from "node:assert/strict";
import test from "node:test";
import {
  braessNetworkContenders,
  braessNetworkScenario,
  solveBraessEquilibrium,
} from "../fixtures/braess-network.mjs";
import { runBlindArena } from "../runner.mjs";

test("canonical closed and free-connector equilibria reproduce the published example", () => {
  const closed = solveBraessEquilibrium({ connectorOpen: false });
  assert.deepEqual(closed.flows, { upper: 2000, lower: 2000, connector: 0 });
  assert.equal(closed.meanTravelMinutes, 65);
  const opened = solveBraessEquilibrium({ connectorOpen: true, connectorPenalty: 0 });
  assert.deepEqual(opened.flows, { upper: 0, lower: 0, connector: 4000 });
  assert.equal(opened.meanTravelMinutes, 80);
});

test("mixed provenance cannot be promoted to external evidence", () => {
  assert.throws(() => runBlindArena({
    arenaId: "braess-false-externality",
    scenario: braessNetworkScenario,
    contenders: braessNetworkContenders,
    seed: 1968,
    blindKey: "braess-test-secret",
    claimExternal: true,
  }), /cannot claim externality/);
});

test("arena preserves the paradox as vector outcomes without a declared winner", () => {
  const { report, sealedIdentityMap } = runBlindArena({
    arenaId: "braess-test",
    scenario: braessNetworkScenario,
    contenders: braessNetworkContenders,
    seed: 1968,
    blindKey: "braess-test-secret",
  });
  const byId = Object.fromEntries(report.runs.map((run) => [sealedIdentityMap[run.label], run]));
  assert.equal(byId["capacity-expansion-heuristic"].outcomes.mean_travel_minutes, 80);
  assert.equal(byId["equilibrium-aware-closure"].outcomes.mean_travel_minutes, 65);
  assert.equal(byId["priced-connector-policy"].outcomes.mean_travel_minutes, 65);
  assert.equal(report.runs.every((run) => !("winner" in run.outcomes)), true);
  assert.equal(report.scenario.source.regime, "mixed");
});
