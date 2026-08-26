#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateScenario } from "../../../../../corpus-11-tools/labs/experiment-lab/arena/contracts.mjs";
import { createRichScenario, validateRichDocument } from "./interpreter.mjs";

const document = JSON.parse(await readFile(new URL("../kryos-bridges-v1.1.1.frozen.json", import.meta.url), "utf8"));
const expectedUrl = new URL("./admission-report.json", import.meta.url);
const validation = validateRichDocument(document);
assert.equal(validation.valid, true, validation.errors.join("\n"));
const scenario = createRichScenario(document);
assert.equal(validateScenario(scenario, { claimExternal: true }), true);

function runTrajectory(initialAction) {
  const trial = scenario.createTrial();
  let selected = initialAction;
  const hiddenLeaks = [];
  for (let round = 0; round < scenario.manifest.rounds; round += 1) {
    const view = scenario.project({ world: structuredClone(trial.world), round, history: [] });
    for (const hidden of document.view.hidden) if (Object.hasOwn(view, hidden)) hiddenLeaks.push(hidden);
    const allowed = scenario.admissibleActions({ view, round });
    if (!allowed.includes(selected)) selected = allowed[0];
    scenario.act({ world: trial.world, action: selected, round, exogenous: trial.exogenous });
    assert.ok(Object.values(scenario.observe({ world: trial.world, round })).every(Number.isFinite));
  }
  const outcomes = scenario.close({ world: trial.world, history: [] });
  assert.ok(Object.values(outcomes).every(Number.isFinite));
  return { trace: trial.world.trace, outcomes, hiddenLeaks };
}

const initialTrial = scenario.createTrial();
const initialView = scenario.project({ world: initialTrial.world, round: 0, history: [] });
const initialBundles = scenario.admissibleActions({ view: initialView, round: 0 });
for (const bundle of initialBundles) {
  const trial = scenario.createTrial();
  scenario.act({ world: trial.world, action: bundle, round: 0, exogenous: trial.exogenous });
}

const actions = Object.keys(document.actions).sort();
const trajectories = Object.fromEntries(actions.map((action) => [action, runTrajectory(action)]));

const drawTrial = scenario.createTrial();
const observedBlockFlags = [];
for (let round = 0; round < 8; round += 1) {
  observedBlockFlags.push(drawTrial.world.state.abyssal_block_flag);
  scenario.act({ world: drawTrial.world, action: "hydraulic_rationing", round, exogenous: drawTrial.exogenous });
}
assert.deepEqual(observedBlockFlags, [0, 1, 1, 0, 1, 1, 1, 0]);

function targetedGlobalRule(ruleId, round, statePatch) {
  const trial = scenario.createTrial();
  Object.assign(trial.world.state, statePatch);
  scenario.act({ world: trial.world, action: "bridge_toll", round, exogenous: trial.exogenous });
  assert.ok(trial.world.trace.at(-1).triggeredGlobalRules.includes(ruleId));
  return trial.world.trace.at(-1).after;
}

targetedGlobalRule("structural_collapse", 0, { structural_integrity: 19 });
targetedGlobalRule("ecosystem_collapse", 0, { marine_ecosystem_health: 15 });
targetedGlobalRule("cascading_failure_risk", 7, { structural_integrity: 49 });

const report = {
  schema: "cct-rich-arena-v3-admission/v1",
  generatedAt: "2026-08-26",
  world: {
    id: document.manifest.id,
    version: document.manifest.version,
    freezeHash: scenario.manifest.source.freezeHash,
    sourceRegime: scenario.manifest.source.regime,
    independenceBoundary: scenario.manifest.source.independenceBoundary,
  },
  structuralValidation: { valid: true, errors: [], warnings: validation.warnings },
  executionValidation: {
    actions: actions.length,
    singletonTrajectoriesCompleted: Object.keys(trajectories).length,
    completeSingletonRounds: actions.length * document.manifest.rounds,
    initialBundlesExecutedOneRound: initialBundles.length,
    finiteOutcomeVectors: Object.keys(trajectories).length,
    hiddenLeaks: Object.values(trajectories).flatMap((result) => result.hiddenLeaks).length,
    precompiledBlockFlagsVerified: observedBlockFlags,
    targetedGlobalRulesTriggered: ["cascading_failure_risk", "structural_collapse", "ecosystem_collapse"],
    delayedEffectsObserved: Object.values(trajectories).some((result) => result.trace.some((entry) => entry.delayed.length > 0)),
  },
  admissionDecision: {
    admittedToRichInterpreterV3: true,
    admittedForCct12Comparison: false,
    reasonNotYetComparable: "A neutral projection into the CCT-EXEC 1.2 interface must be specified and frozen before contender execution.",
  },
  statusBoundary: "Locally tested interpreter admission only. No CCT trajectory, superiority, robustness, authorization, deployment, independent lineage verification or external transport is established.",
};

if (process.argv.includes("--check")) {
  const expected = JSON.parse(await readFile(expectedUrl, "utf8"));
  assert.deepEqual(report, expected);
  console.log(JSON.stringify({ valid: true, admitted: true, freezeHash: report.world.freezeHash }, null, 2));
} else process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
