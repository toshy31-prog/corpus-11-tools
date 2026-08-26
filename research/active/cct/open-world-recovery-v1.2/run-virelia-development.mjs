#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stableHash } from "../../../../corpus-11-tools/labs/experiment-lab/core/reproducibility.mjs";
import { createRichScenario } from "../sequenced-recovery/rich-arena-v2/interpreter.mjs";
import { loadProjectionContract, projectCctInterface } from "../sequenced-recovery/projection-campaign/runtime.mjs";
import { createCctOpenWorldRecoveryContender } from "./runtime.mjs";

const worldUrl = new URL("../sequenced-recovery/scenario-intake/virelia-fractured-atoll-cascade-v1.0.0-r2.frozen.json", import.meta.url);
const reportUrl = new URL("./virelia-development-report.json", import.meta.url);
const document = JSON.parse(await readFile(worldUrl, "utf8"));
const contract = loadProjectionContract(new URL("../sequenced-recovery/projection-campaign/contract.json", import.meta.url));

function attachEffectEvidence(view, profileId) {
  if (!view.cct) return view;
  const projected = structuredClone(view);
  for (const semantics of Object.values(projected.cct.actionOntology)) {
    const raw = semantics.projectionTrace.proxyEffects;
    semantics.effectEvidence = {
      axisDeltas: Object.fromEntries(Object.entries(raw).map(([axis, value]) => [
        axis,
        profileId === "P2-optimistic-harm-omission" ? Math.max(0, value) : value,
      ])),
      observedFrom: "public_immediate_effects",
      noFutureLeak: true,
    };
  }
  return projected;
}

function run(profileId) {
  const scenario = createRichScenario(document);
  const trial = scenario.createTrial({ seed: 23 });
  const contender = createCctOpenWorldRecoveryContender({ predictionKeys: scenario.manifest.predictionKeys });
  const baseline = { worldHash: stableHash(trial.world), exogenousHash: stableHash(trial.exogenous) };
  const actions = [];
  let failure = null;
  for (let round = 0; round < scenario.manifest.rounds; round += 1) {
    const baseView = scenario.project({ world: structuredClone(trial.world), round, history: [] });
    const allowedActions = scenario.admissibleActions({ view: baseView, round });
    const projected = projectCctInterface({ contract, document, baseView, allowedActions, profileId, tick: round });
    const view = attachEffectEvidence(projected, profileId);
    try {
      const decision = contender.decide({ view, allowedActions, history: [], round });
      actions.push({ round, action: decision.action, phase: decision.governance.phase, harmedAxes: decision.governance.harmedAxes ?? [] });
      scenario.act({ world: trial.world, action: decision.action, round, exogenous: structuredClone(trial.exogenous) });
    } catch (error) {
      const snapshot = contender.snapshot();
      failure = { tick: round, code: error.message, phase: snapshot.state.phase };
      break;
    }
  }
  const snapshot = contender.snapshot();
  return {
    profileId,
    baseline,
    completedRounds: actions.length,
    actions,
    failure,
    openDebts: snapshot.state.debts.filter((debt) => debt.status === "open").map((debt) => ({ axis: debt.axis, deadline: debt.deadline, attributionStatus: debt.attributionStatus })),
    terminalFailure: snapshot.state.terminalFailure,
    prefixOutcomeVector: scenario.close({ world: structuredClone(trial.world), history: [] }),
    prefixComparableAtEightRounds: failure === null && actions.length === scenario.manifest.rounds,
  };
}

const runs = ["P1-matched-public-mechanics", "P2-optimistic-harm-omission"].map(run);
assert.ok(runs.every((runResult) => runResult.baseline.worldHash === runs[0].baseline.worldHash && runResult.baseline.exogenousHash === runs[0].baseline.exogenousHash));

const report = {
  schema: "cct-open-world-recovery-virelia-development/v1",
  generatedAt: "2026-08-26",
  candidate: "CCT-EXEC-1.2-CANDIDATE-001",
  sourceCampaignFreeze: "CCT-VIRELIA-PROJECTION-FREEZE-2026-08-26-01",
  reuseBoundary: "Observed Virelia profiles are development regressions only. They cannot accept, promote or establish robustness of the candidate built after their failures were known.",
  runs,
  comparisonToFrozen11: {
    P1: { frozen11CompletedRounds: 0, candidate12CompletedRounds: runs[0].completedRounds },
    P2: { frozen11CompletedRounds: 1, candidate12CompletedRounds: runs[1].completedRounds },
    interpretation: "The candidate repairs refusal attribution and discovers a bounded acquisition action, but this is local adaptation to an already observed campaign.",
  },
  result: {
    bothProfilesAvoidFalseI13Attribution: runs.every((runResult) => !runResult.failure?.code.includes("I13")),
    bothProfilesReachCapacityAcquisition: runs.every((runResult) => runResult.actions.some((action) => action.phase === "capacity_acquisition")),
    bothProfilesRejectUnverifiedGain: runs.every((runResult) => runResult.failure?.code === "CCT_CAPACITY_GAIN_UNVERIFIED"),
    completeEightRoundPaths: runs.filter((runResult) => runResult.prefixComparableAtEightRounds).length,
  },
  strongestConclusion: "CCT-EXEC 1.2 locally repairs the two named control-path defects on the already observed Virelia campaign, then fails honestly at independent gain verification; no robustness or promotion follows.",
  statusBoundary: "Post-failure development regression, not held-out evidence. No authorization, deployment, institutional effect, superiority, independent reobservation or external transport is established.",
};

if (process.argv.includes("--check")) {
  const expected = JSON.parse(await readFile(reportUrl, "utf8"));
  assert.deepEqual(report, expected);
  console.log(JSON.stringify({ valid: true, reportHash: stableHash(report) }, null, 2));
} else {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}
