import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createDeclarativeScenario } from "../declarative/adapter.mjs";
import { computeScenarioHash } from "../declarative/hash.mjs";
import { declarativePulseContenders } from "../fixtures/declarative-pulse-contenders.mjs";
import { ilyanaBellContenders } from "../fixtures/ilyana-bell-contenders.mjs";
import { runBlindArena } from "../runner.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const frozen = JSON.parse(await readFile(resolve(here, "../fixtures/declarative-pulse.json"), "utf8"));
const ilyanaBell = JSON.parse(await readFile(resolve(here, "../fixtures/ilyana-bell.json"), "utf8"));

function refreeze(document) {
  document.freeze = { algorithm: "sha256", contentHash: computeScenarioHash(document) };
  return document;
}

test("frozen declarative world executes without scenario code", () => {
  const scenario = createDeclarativeScenario(structuredClone(frozen));
  const { report } = runBlindArena({
    arenaId: "declarative-test",
    scenario,
    contenders: declarativePulseContenders,
    seed: 1,
    blindKey: "declarative-test-secret",
  });
  assert.equal(report.runs.length, 2);
  assert.equal(report.scenario.source.freezeVerified, true);
  assert.equal(report.scenario.source.regime, "internal_synthetic");
});

test("any post-freeze semantic mutation is rejected", () => {
  const changed = structuredClone(frozen);
  changed.initialState.stock = 999;
  assert.throws(() => createDeclarativeScenario(changed), /freeze mismatch/);
});

test("refreezing cannot make an unsupported operator executable", () => {
  const hostile = structuredClone(frozen);
  hostile.transition[0].value = { op: "eval", args: ["process.exit()"] };
  const scenario = createDeclarativeScenario(refreeze(hostile));
  assert.throws(() => runBlindArena({
    arenaId: "hostile-operator",
    scenario,
    contenders: declarativePulseContenders,
    seed: 1,
    blindKey: "hostile-test-secret",
  }), /unsupported expression operator/);
});

test("prototype paths are rejected even in a correctly frozen document", () => {
  const hostile = structuredClone(frozen);
  hostile.view.stock = { path: "state.__proto__.polluted" };
  const scenario = createDeclarativeScenario(refreeze(hostile));
  assert.throws(() => runBlindArena({
    arenaId: "hostile-path",
    scenario,
    contenders: declarativePulseContenders,
    seed: 1,
    blindKey: "hostile-test-secret",
  }), /unsafe expression path/);
});

test("external declaration requires a verified freeze and remains an authorship claim", () => {
  const external = structuredClone(frozen);
  external.manifest.id = "declared-external-fixture";
  external.source = {
    regime: "external_supplied",
    authorId: "independent-test-author",
    authorRelationToCorpus: "independent",
    frozenBeforeContenders: true,
    authorshipTrace: "test-author-trace",
  };
  const scenario = createDeclarativeScenario(refreeze(external));
  const { report } = runBlindArena({
    arenaId: "declared-external-test",
    scenario,
    contenders: declarativePulseContenders,
    seed: 1,
    blindKey: "external-test-secret",
    claimExternal: true,
  });
  assert.equal(report.externalityStatus, "declared_external_with_verified_freeze_authorship_not_independently_verified");
});

test("fictional adversarial authors remain internal and preserve incompatible outcomes", () => {
  const scenario = createDeclarativeScenario(structuredClone(ilyanaBell));
  const { report, sealedIdentityMap } = runBlindArena({
    arenaId: "ilyana-bell-test",
    scenario,
    contenders: ilyanaBellContenders,
    seed: 1,
    blindKey: "ilyana-fiction-secret",
  });
  const byIdentity = Object.fromEntries(report.runs.map((run) => [sealedIdentityMap[run.label], run.outcomes]));

  assert.equal(report.externalityStatus, "internal_synthetic_not_external_evidence");
  assert.deepEqual(byIdentity["nearest-note"], {
    pitch_error: 0, craze: 14, clay_removed: 3, sleep: 0,
  });
  assert.deepEqual(byIdentity["one-touch"], {
    pitch_error: 12, craze: 11, clay_removed: 0, sleep: 3,
  });
  assert.equal(report.conclusionBoundary, "vector_outcomes_only_no_unique_winner");
});
