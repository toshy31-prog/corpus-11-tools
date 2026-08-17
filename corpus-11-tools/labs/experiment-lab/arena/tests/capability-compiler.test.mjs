import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { findDominated, findOutcomeEquivalents } from "../campaign/pareto.mjs";
import { compileCapabilityBinding } from "../compiler/compiler.mjs";
import { compiledFieldCapacityIlyana } from "../compiler/field-capacity-ilyana-binding.mjs";
import { compiledHiddenCostIlyana } from "../compiler/hidden-cost-ilyana-binding.mjs";
import { compiledHiddenCostThermal, thermalHoldControl } from "../compiler/hidden-cost-thermal-binding.mjs";
import { createDeclarativeScenario } from "../declarative/adapter.mjs";
import { ilyanaBellContenders } from "../fixtures/ilyana-bell-contenders.mjs";
import { thermalMosaicScenario } from "../fixtures/thermal-mosaic.mjs";
import { applyLifecycleRegistry } from "../lifecycle/select.mjs";
import { proposeLifecycleDecision } from "../lifecycle/decide.mjs";
import { runBlindArena } from "../runner.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const document = JSON.parse(await readFile(resolve(here, "../fixtures/ilyana-bell.json"), "utf8"));
const lifecyclePolicy = JSON.parse(await readFile(resolve(here, "../lifecycle/policy.json"), "utf8"));

test("a capability cannot compile without a separately named decision extension", () => {
  assert.throws(() => compileCapabilityBinding({
    capabilityId: "CAP.TEST",
    capabilityStatus: "candidate_unvalidated",
    domain: "test",
    observableMapping: {},
    predictionModel() {},
    assessment() {},
    decisionExtension() {},
  }), /decisionExtensionId is required/);
});

test("compiled hidden-cost binding enters the arena without hiding its added preference", () => {
  const scenario = createDeclarativeScenario(structuredClone(document));
  const contenders = [compiledHiddenCostIlyana, ilyanaBellContenders[0]];
  const { report, sealedIdentityMap } = runBlindArena({
    arenaId: "compiled-hidden-cost-ilyana-test",
    scenario,
    contenders,
    seed: 1,
    blindKey: "compiled-hidden-cost-secret",
  });
  const compiledRun = report.runs.find((run) => sealedIdentityMap[run.label] === compiledHiddenCostIlyana.manifest.id);

  assert.deepEqual(compiledRun.outcomes, {
    pitch_error: 14, craze: 8, clay_removed: 0, sleep: 4,
  });
  assert.equal(
    compiledHiddenCostIlyana.manifest.compilation.conclusionBoundary,
    "actions_depend_on_declared_decision_extension_not_capability_alone",
  );
  assert.deepEqual(compiledHiddenCostIlyana.manifest.compilation.observableMapping.unsupported, [
    "time", "energy", "attention", "carrier", "post-removal trace",
  ]);
});

test("campaign prunes a compiled binding dominated by a simple policy", () => {
  const scenario = createDeclarativeScenario(structuredClone(document));
  const neverWet = ilyanaBellContenders.find((item) => item.manifest.id === "never-wet");
  const contenders = [compiledFieldCapacityIlyana, neverWet];
  const { report, sealedIdentityMap } = runBlindArena({
    arenaId: "field-capacity-pruning-test",
    scenario,
    contenders,
    seed: 1,
    blindKey: "field-pruning-secret",
  });
  const outcomes = Object.fromEntries(report.runs.map((run) => [sealedIdentityMap[run.label], run.outcomes]));
  const dominated = findDominated(outcomes, {
    pitch_error: "min", craze: "min", clay_removed: "min", sleep: "max",
  });

  assert.deepEqual(dominated[compiledFieldCapacityIlyana.manifest.id], ["never-wet"]);
  assert.equal(dominated["never-wet"], undefined);
});

test("local quarantine is enforced in scope and remains reversible", async () => {
  const registry = JSON.parse(await readFile(resolve(here, "../lifecycle/registry.json"), "utf8"));
  const candidates = [compiledFieldCapacityIlyana, compiledHiddenCostIlyana];
  const normal = applyLifecycleRegistry(candidates, registry, { scope: document.manifest.id });
  const audit = applyLifecycleRegistry(candidates, registry, {
    scope: document.manifest.id, includeQuarantined: true,
  });

  assert.deepEqual(normal.active.map((item) => item.manifest.id), [compiledHiddenCostIlyana.manifest.id]);
  assert.deepEqual(normal.excluded.map((item) => item.contenderId), [compiledFieldCapacityIlyana.manifest.id]);
  assert.equal(audit.active.length, 2);
});

test("transport target exposes exact equivalence with a negative control", () => {
  const contenders = [compiledHiddenCostThermal, thermalHoldControl];
  const { report, sealedIdentityMap } = runBlindArena({
    arenaId: "hidden-cost-transport-equivalence-test",
    scenario: thermalMosaicScenario,
    contenders,
    seed: 17,
    blindKey: "transport-equivalence-secret",
  });
  const outcomes = Object.fromEntries(report.runs.map((run) => [sealedIdentityMap[run.label], run.outcomes]));
  assert.deepEqual(findOutcomeEquivalents(outcomes), [[
    compiledHiddenCostThermal.manifest.id,
    thermalHoldControl.manifest.id,
  ]]);
  const proposal = proposeLifecycleDecision({
    candidateId: compiledHiddenCostThermal.manifest.id,
    report,
    sealedIdentityMap,
    policy: lifecyclePolicy,
    negativeControlIds: [thermalHoldControl.manifest.id],
  });
  assert.equal(proposal.proposal, "propose_quarantine_local");
  assert.equal(proposal.evaluatorAuthority, "proposal_only");
  assert.equal(proposal.triggers[0].rule, "exactNegativeControlEquivalence");
});

test("thermal hidden-cost quarantine is enforced only in its target scope", async () => {
  const registry = JSON.parse(await readFile(resolve(here, "../lifecycle/registry.json"), "utf8"));
  const thermal = applyLifecycleRegistry([compiledHiddenCostThermal], registry, {
    scope: thermalMosaicScenario.manifest.id,
  });
  const other = applyLifecycleRegistry([compiledHiddenCostThermal], registry, {
    scope: document.manifest.id,
  });
  assert.equal(thermal.active.length, 0);
  assert.equal(thermal.excluded.length, 1);
  assert.equal(other.active.length, 1);
});
