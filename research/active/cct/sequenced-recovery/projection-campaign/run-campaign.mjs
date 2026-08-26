#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stableHash } from "../../../../../corpus-11-tools/labs/experiment-lab/core/reproducibility.mjs";
import { createCctSequencedRecoveryContender } from "../runtime.mjs";
import { createRichScenario } from "../rich-arena-v2/interpreter.mjs";
import { loadProjectionContract, projectCctInterface, validateProjectionContract } from "./runtime.mjs";

const worldUrl = new URL("../scenario-intake/virelia-fractured-atoll-cascade-v1.0.0-r2.frozen.json", import.meta.url);
const reportUrl = new URL("./campaign-report.json", import.meta.url);
const document = JSON.parse(await readFile(worldUrl, "utf8"));
const contract = loadProjectionContract();
assert.deepEqual(validateProjectionContract(contract), []);

function numericPredictions(scenario, view) {
  return Object.fromEntries(scenario.manifest.predictionKeys.map((key) => [key, view[key]]));
}

function setup() {
  const scenario = createRichScenario(document);
  const trial = scenario.createTrial({ seed: 19 });
  return { scenario, trial };
}

function projectedRound({ scenario, trial, profileId, round }) {
  const baseView = scenario.project({ world: structuredClone(trial.world), round, history: [] });
  const allowedActions = scenario.admissibleActions({ view: structuredClone(baseView), round });
  const view = projectCctInterface({ contract, document, baseView, allowedActions, profileId, tick: round });
  return { baseView, allowedActions, view };
}

function runCct(profileId) {
  const { scenario, trial } = setup();
  const baseline = { worldHash: stableHash(trial.world), exogenousHash: stableHash(trial.exogenous) };
  const contender = createCctSequencedRecoveryContender({ predictionKeys: scenario.manifest.predictionKeys });
  const history = [];
  let failure = null;
  for (let round = 0; round < scenario.manifest.rounds; round += 1) {
    const { allowedActions, view } = projectedRound({ scenario, trial, profileId, round });
    let decision;
    try {
      decision = contender.decide({ view: structuredClone(view), allowedActions: structuredClone(allowedActions), history: structuredClone(history), round });
    } catch (error) {
      failure = { tick: round, code: error.message, phase: contender.snapshot().state.phase };
      break;
    }
    scenario.act({ world: trial.world, action: decision.action, round, exogenous: structuredClone(trial.exogenous) });
    const observation = scenario.observe({ world: structuredClone(trial.world), round });
    history.push({ round, action: decision.action, observation, governance: decision.governance });
  }
  return {
    baseline,
    completedRounds: history.length,
    controlFailure: failure,
    actionTrace: history.map(({ round, action, governance }) => ({ round, action, phase: governance.phase, constitutionalStatus: governance.constitutionalStatus })),
    prefixOutcomeVector: scenario.close({ world: structuredClone(trial.world), history: structuredClone(history) }),
    prefixOutcomeComparableAtEightRounds: failure === null && history.length === scenario.manifest.rounds,
    runtimeTrace: contender.snapshot().trace,
  };
}

const policies = {
  "low-cost-public": ({ allowedActions, view }) => [...allowedActions].sort((left, right) => {
    const cost = view.cct.actionOntology[left].resourceCost - view.cct.actionOntology[right].resourceCost;
    return cost || left.localeCompare(right);
  })[0],
  "max-protection-public": ({ allowedActions, view }) => [...allowedActions].sort((left, right) => {
    const score = (action) => view.cct.actionOntology[action].protectsAxes.length - view.cct.actionOntology[action].harmsAxes.length;
    return score(right) - score(left) || left.localeCompare(right);
  })[0],
  "last-admissible": ({ allowedActions }) => allowedActions.at(-1),
};

function runPolicy(profileId, policyId, policy) {
  const { scenario, trial } = setup();
  const baseline = { worldHash: stableHash(trial.world), exogenousHash: stableHash(trial.exogenous) };
  const history = [];
  for (let round = 0; round < scenario.manifest.rounds; round += 1) {
    const { allowedActions, view } = projectedRound({ scenario, trial, profileId, round });
    const action = policy({ allowedActions: structuredClone(allowedActions), view: structuredClone(view), history: structuredClone(history), round });
    assert.ok(allowedActions.includes(action));
    scenario.act({ world: trial.world, action, round, exogenous: structuredClone(trial.exogenous) });
    history.push({ round, action, predictions: numericPredictions(scenario, view), observation: scenario.observe({ world: structuredClone(trial.world), round }) });
  }
  return {
    policyId,
    baseline,
    completedRounds: history.length,
    actionTrace: history.map(({ action }) => action),
    outcomeVector: scenario.close({ world: structuredClone(trial.world), history }),
  };
}

const strict = (() => {
  const { scenario, trial } = setup();
  const contender = createCctSequencedRecoveryContender({ predictionKeys: scenario.manifest.predictionKeys });
  const { allowedActions, view } = projectedRound({ scenario, trial, profileId: "P0-strict-original-view", round: 0 });
  try {
    contender.decide({ view, allowedActions, history: [], round: 0 });
    return { executable: true, observed: "NO_ERROR" };
  } catch (error) {
    return { executable: false, observed: error.message };
  }
})();

const executableProfiles = ["P1-matched-public-mechanics", "P2-optimistic-harm-omission"];
const runs = executableProfiles.map((profileId) => {
  const cct = runCct(profileId);
  const rivals = Object.entries(policies).map(([policyId, policy]) => runPolicy(profileId, policyId, policy));
  const baselines = [cct.baseline, ...rivals.map((rival) => rival.baseline)];
  assert.ok(baselines.every((baseline) => baseline.worldHash === baselines[0].worldHash && baseline.exogenousHash === baselines[0].exogenousHash));
  const { baseline: _cctBaseline, ...cctReport } = cct;
  return {
    profileId,
    matchedBaseline: baselines[0],
    cct: cctReport,
    rivals: rivals.map(({ baseline: _baseline, ...rival }) => rival),
    conclusion: cct.controlFailure
      ? "CCT control failure; its prefix outcome is not comparable with eight-round rival outcomes"
      : "CCT completed; retain vector outcomes without scalar winner",
  };
});

const report = {
  schema: "cct-virelia-projection-campaign/v1",
  generatedAt: "2026-08-26",
  world: { id: document.manifest.id, version: document.manifest.version, freezeHash: contract.worldFreeze.contentHash },
  cct: { id: "CCT-EXEC-1.1-CANDIDATE-001", freezeId: contract.cctFreeze.id },
  sourceBoundary: "Virelia bytes were frozen before CCT execution, but generator lineage is not independently verified.",
  strictOriginalView: strict,
  runs,
  vectorVerdict: {
    executableProfiles: executableProfiles.length,
    cctControlFailures: runs.filter((run) => run.cct.controlFailure).length,
    cctEightRoundCompletions: runs.filter((run) => run.cct.prefixOutcomeComparableAtEightRounds).length,
    rivalEightRoundCompletions: runs.reduce((sum, run) => sum + run.rivals.filter((rival) => rival.completedRounds === document.manifest.rounds).length, 0),
    noScalarWinner: true,
    strongestConclusion: "CCT-EXEC 1.1 is not executable under Virelia's original information regime and reaches a control failure under both disclosed executable projection variants; no eight-round material CCT outcome is attributable.",
  },
  methodEffectAudit: {
    originalViewPreservedByP0: true,
    P0CctInterfaceAvailable: false,
    executableProfilesAddActionOntology: true,
    proxyConstructValidity: "proxy_substitution",
    powerAttributionObservable: false,
    actorRecourseAndDebtFieldsPresentInVirelia: false,
    postFailureMaterialOutcomesFabricated: false,
    neutralityClaim: "withdrawn",
  },
  logicFindings: [
    {
      id: "VF-01-harm-i13-conflation",
      observation: "P1 contains no forbidden constitutional tags, yet CCT emits CCT_I13_NO_CONSTITUTIONALLY_ADMISSIBLE_ACTION because every action has at least one compiled axis harm.",
      implication: "The runtime conflates absence of a zero-harm action with I13 constitutional inadmissibility, obscuring the actual tradeoff/action-capacity failure.",
    },
    {
      id: "VF-02-recovery-ontology-dependence",
      observation: "After P2 suppresses every compiled harm, CCT performs one triage action and then fails because no physical Virelia action satisfies its capacity-acquisition ontology.",
      implication: "Sequenced recovery is not open-world executable without externally supplied institutional recovery kinds, actors, recourse and receipts.",
    },
  ],
  transportVerdict: "not_transportable_without_method_added_institutional_semantics",
  statusBoundary: "Synthetic frozen-world control failure under maintainer-authored projections. It establishes neither field failure nor general invalidity of CCT, and the rival material vectors are not scalar-ranked.",
};

if (process.argv.includes("--check")) {
  const expected = JSON.parse(await readFile(reportUrl, "utf8"));
  assert.deepEqual(report, expected);
  console.log(JSON.stringify({ valid: true, reportHash: stableHash(report) }, null, 2));
} else {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}
