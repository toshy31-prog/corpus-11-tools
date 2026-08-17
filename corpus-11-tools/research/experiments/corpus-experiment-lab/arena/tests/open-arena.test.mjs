import assert from "node:assert/strict";
import test from "node:test";
import { thermalMosaicContenders, thermalMosaicScenario } from "../fixtures/thermal-mosaic.mjs";
import { runBlindArena } from "../runner.mjs";

function run(contenders = thermalMosaicContenders) {
  return runBlindArena({
    arenaId: "open-arena-test",
    scenario: thermalMosaicScenario,
    contenders,
    seed: 17,
    blindKey: "test-secret-key",
  });
}

test("all contenders receive the same frozen world and exogenous sequence", () => {
  const { report } = run();
  assert.equal(report.runs.length, 3);
  for (const candidate of report.runs) assert.deepEqual(candidate.baseline, report.matchedBaseline);
});

test("public report is blinded and keeps outcomes multidimensional", () => {
  const { report, sealedIdentityMap } = run();
  const serialized = JSON.stringify(report);
  for (const contender of thermalMosaicContenders) {
    assert.equal(serialized.includes(contender.manifest.id), false);
    assert.equal(serialized.includes(contender.manifest.family), false);
  }
  assert.equal(Object.keys(sealedIdentityMap).length, thermalMosaicContenders.length);
  assert.equal(report.conclusionBoundary, "vector_outcomes_only_no_unique_winner");
  assert.equal(report.runs.every((item) => !("winner" in item.outcomes)), true);
});

test("contender order cannot change the deterministic report", () => {
  const forward = run(thermalMosaicContenders).report;
  const reversed = run([...thermalMosaicContenders].reverse()).report;
  assert.deepEqual(reversed, forward);
});

test("internal fixture cannot be promoted to external evidence", () => {
  assert.throws(() => runBlindArena({
    arenaId: "false-externality",
    scenario: thermalMosaicScenario,
    contenders: thermalMosaicContenders,
    seed: 17,
    blindKey: "test-secret-key",
    claimExternal: true,
  }), /cannot claim externality/);
});

test("observer view mutation cannot reach world truth", () => {
  const malicious = {
    manifest: { id: "view-mutator", version: "1.0.0", title: "View mutator", family: "negative-control" },
    decide({ view }) {
      view.sensors.fill(999);
      return { action: "hold", predictions: { nextMean: 999 } };
    },
  };
  const honest = thermalMosaicContenders[0];
  const { report } = run([malicious, honest]);
  assert.equal(report.runs.every((item) => item.finalWorldHash !== null), true);
  const maliciousRun = report.runs.find((item) => sealedId(item.label) === "view-mutator");
  function sealedId(label) {
    return run([malicious, honest]).sealedIdentityMap[label];
  }
  assert.equal(maliciousRun.history[0].observation.sensors.every((value) => value < 20), true);
});
