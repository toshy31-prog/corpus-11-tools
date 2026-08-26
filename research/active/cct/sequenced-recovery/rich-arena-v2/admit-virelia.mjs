#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stableHash } from "../../../../../corpus-11-tools/labs/experiment-lab/core/reproducibility.mjs";
import { validateScenario } from "../../../../../corpus-11-tools/labs/experiment-lab/arena/contracts.mjs";
import { runBlindArena } from "../../../../../corpus-11-tools/labs/experiment-lab/arena/runner.mjs";
import { createRichScenario, validateRichDocument } from "./interpreter.mjs";

const scenarioUrl = new URL("../scenario-intake/virelia-fractured-atoll-cascade-v1.0.0-r2.frozen.json", import.meta.url);
const reportUrl = new URL("./admission-report.json", import.meta.url);
const document = JSON.parse(await readFile(scenarioUrl, "utf8"));
const validation = validateRichDocument(document);
assert.equal(validation.valid, true, validation.errors.join("\n"));
const scenario = createRichScenario(document);
assert.equal(validateScenario(scenario, { claimExternal: true }), true);

function numericPrediction(view) {
  return Object.fromEntries(scenario.manifest.predictionKeys.map((key) => [key, view[key]]));
}

function contender(id, selection) {
  return {
    manifest: { id, version: "1.0.0", title: id, family: "interpreter-admission-smoke" },
    decide({ view, allowedActions }) {
      return { action: selection(allowedActions), predictions: numericPrediction(view) };
    },
  };
}

function runTrajectory(initialAction) {
  const trial = scenario.createTrial();
  let selected = initialAction;
  const views = [];
  for (let round = 0; round < scenario.manifest.rounds; round += 1) {
    const view = scenario.project({ world: structuredClone(trial.world), round, history: [] });
    views.push(structuredClone(view));
    const allowed = scenario.admissibleActions({ view: structuredClone(view), round });
    if (!allowed.includes(selected)) selected = allowed[0];
    scenario.act({ world: trial.world, action: selected, round, exogenous: structuredClone(trial.exogenous) });
    const observation = scenario.observe({ world: structuredClone(trial.world), round });
    assert.ok(Object.values(observation).every(Number.isFinite));
  }
  const outcomes = scenario.close({ world: structuredClone(trial.world), history: [] });
  assert.ok(scenario.manifest.dimensions.every((dimension) => Number.isFinite(outcomes[dimension])));
  return { world: trial.world, views, outcomes };
}

const initialTrial = scenario.createTrial();
const initialView = scenario.project({ world: structuredClone(initialTrial.world), round: 0, history: [] });
const initialBundles = scenario.admissibleActions({ view: initialView, round: 0 });
const singletonActions = Object.keys(document.actions).sort();
assert.ok(singletonActions.every((action) => initialBundles.includes(action)));

const oneRoundBundleHashes = {};
for (const bundle of initialBundles) {
  const trial = scenario.createTrial();
  scenario.act({ world: trial.world, action: bundle, round: 0, exogenous: structuredClone(trial.exogenous) });
  oneRoundBundleHashes[bundle] = stableHash(trial.world);
}

const trajectories = Object.fromEntries(singletonActions.map((action) => [action, runTrajectory(action)]));
const hiddenLeakCount = Object.values(trajectories).reduce((count, trajectory) => count + trajectory.views.reduce(
  (viewCount, view) => viewCount + document.view.hidden.filter((name) => Object.hasOwn(view, name)).length,
  0,
), 0);

const smokeArena = runBlindArena({
  arenaId: "virelia-rich-v2-admission-smoke",
  scenario,
  contenders: [
    contender("neutral-first-action", (allowed) => allowed[0]),
    contender("neutral-last-action", (allowed) => allowed.at(-1)),
  ],
  seed: 11,
  blindKey: "admission-smoke-only-not-evidence",
  claimExternal: true,
});

const allTraces = Object.values(trajectories).flatMap((trajectory) => trajectory.world.trace);
const report = {
  schema: "cct-rich-arena-v2-admission/v1",
  generatedAt: "2026-08-26",
  interpreter: "cct-rich-arena-v2/1.0-candidate",
  world: {
    id: document.manifest.id,
    version: document.manifest.version,
    freezeHash: scenario.manifest.source.freezeHash,
    frozenBeforeContenders: document.source.frozenBeforeContenders,
    sourceRegime: scenario.manifest.source.regime,
    independenceBoundary: scenario.manifest.source.independenceBoundary,
  },
  structuralValidation: {
    richDocumentValid: validation.valid,
    openArenaContractValid: true,
    warnings: validation.warnings,
  },
  executionValidation: {
    roundsPerTrajectory: scenario.manifest.rounds,
    singletonActionsExpected: singletonActions.length,
    singletonActionsCompleted: Object.keys(trajectories).length,
    completeRoundsExecuted: Object.keys(trajectories).length * scenario.manifest.rounds,
    initiallyAdmissibleBundles: initialBundles.length,
    initiallyAdmissibleBundlesExecutedOneRound: Object.keys(oneRoundBundleHashes).length,
    initialBundleWorldHashes: oneRoundBundleHashes,
    trajectoryFinalHashes: Object.fromEntries(Object.entries(trajectories).map(([action, result]) => [action, stableHash(result.world)])),
    finiteOutcomeVectors: Object.values(trajectories).length,
    hiddenVariableLeaksInPublicViews: hiddenLeakCount,
    delayedEffectsObserved: allTraces.some((entry) => entry.delayed?.length > 0),
    persistentCapsObserved: Object.values(trajectories).some((trajectory) => Object.keys(trajectory.world.caps).length > 0),
    reversalFlagsObserved: [...new Set(Object.values(trajectories).flatMap((trajectory) => Object.entries(trajectory.world.reversalFlags).filter(([, value]) => value).map(([id]) => id)))].sort(),
  },
  matchedSmokeArena: {
    purpose: "interpreter execution and matched-baseline smoke test only; not a CCT comparison and not superiority evidence",
    contenders: 2,
    roundsPerContender: scenario.manifest.rounds,
    matchedBaseline: smokeArena.report.matchedBaseline,
    reportHash: smokeArena.report.reportHash,
    externalityStatus: smokeArena.report.externalityStatus,
    conclusionBoundary: smokeArena.report.conclusionBoundary,
  },
  evaluatorConventions: [
    "two-action bundles are unordered sets and execute in canonical action-id order",
    "admissible bundle lists expose hidden-precondition feasibility and therefore constitute an acknowledged side channel",
    "permanent min|max effects retain their declared numeric literal as a ceiling or floor; later damage does not tighten it",
    "lock_all_dimensions_failed fixes every dimension at its declared failure threshold and emits an explicit numeric reversal flag",
    "prediction targets are restricted to public observable variables",
    "if no declared action is admissible, a reserved forced-inaction action advances only exogenous and due delayed effects",
  ],
  admissionDecision: {
    admittedToRichInterpreterV2: true,
    admittedForCctComparison: false,
    reasonNotYetCctComparable: "CCT-EXEC 1.1 requires a frozen neutral projection from Virelia variables/actions/outcomes into its six risk axes, capacity budget, action semantics, receipts and recovery timing; none is yet specified.",
  },
  statusBoundary: "Locally tested interpreter admission only. No CCT trajectory, robustness, superiority, authorization, deployment, institutional effect, independent lineage verification or external transport is established.",
};

if (process.argv.includes("--check")) {
  const expected = JSON.parse(await readFile(reportUrl, "utf8"));
  assert.deepEqual(report, expected);
  console.log(JSON.stringify({ valid: true, reportHash: stableHash(report) }, null, 2));
} else {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}
