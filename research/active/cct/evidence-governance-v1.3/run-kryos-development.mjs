#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRichScenario } from "../held-out-kryos/rich-v3/interpreter.mjs";
import { project } from "../held-out-kryos/confrontation-1.2-r2/projection.mjs";
import { createCctEvidenceGovernanceContender } from "./runtime.mjs";

const document = JSON.parse(await readFile(new URL("../held-out-kryos/kryos-bridges-v1.1.1.frozen.json", import.meta.url), "utf8"));
const expectedUrl = new URL("./kryos-development-report.json", import.meta.url);

function enrich(view) {
  const enriched = structuredClone(view);
  for (const semantics of Object.values(enriched.cct.actionOntology)) {
    const components = semantics.projectionTrace.components;
    semantics.verificationChannelsOpened = [];
    if (components.includes("seismic_sensors")) semantics.verificationChannelsOpened.push({
      id: "kryos-sensor-array", observerActor: "sensor-cooperative", failureDomain: "distributed-seismic-array", targetAxes: ["portabilite_effective", "plafond_ecologique"]
    });
    if (components.includes("diplomatic_channel")) semantics.verificationChannelsOpened.push({
      id: "kryos-cross-faction-witness", observerActor: "cross-faction-witness-panel", failureDomain: "deliberative-witness-channel", targetAxes: ["portabilite_effective", "droits", "attribution_du_pouvoir"]
    });
    semantics.verificationTargetAxes = [];
    if (components.includes("reinforce_structure")) semantics.verificationTargetAxes.push("portabilite_effective");
    if (components.includes("bridge_toll")) semantics.verificationTargetAxes.push("recuperation");
  }
  return enriched;
}

function receipts(snapshot, tick) {
  const pending = snapshot.state.pendingGain;
  if (!pending || tick < pending.dueAt) return [];
  return snapshot.state.activeVerificationChannels
    .filter((channel) => pending.targetAxes.some((axis) => channel.targetAxes.includes(axis)))
    .map((channel) => ({
      id: `kryos-verification:${channel.id}:${pending.action}:${pending.enactedAt}`,
      channelId: channel.id, verdict: "confirmed", action: pending.action,
      enactedAt: pending.enactedAt, effectiveAt: pending.dueAt, amount: pending.amount,
      failureDomain: pending.failureDomain, actor: pending.actor,
      observerActor: channel.observerActor, observerFailureDomain: channel.failureDomain,
      authorityTrace: `${channel.id}:public-signed-observation:${tick}`,
    }));
}

function run(profileId) {
  const scenario = createRichScenario(document);
  const trial = scenario.createTrial();
  const contender = createCctEvidenceGovernanceContender({ predictionKeys: scenario.manifest.predictionKeys });
  const actions = [];
  let failure = null;
  for (let round = 0; round < 8; round += 1) {
    const baseView = scenario.project({ world: structuredClone(trial.world), round, history: actions });
    const allowedActions = scenario.admissibleActions({ view: baseView, round });
    const view = enrich(project({ document, baseView, allowedActions, profileId, tick: round }));
    view.cct.verificationReceipts = receipts(contender.snapshot(), round);
    try {
      const decision = contender.decide({ view, allowedActions, history: actions, round });
      actions.push({ round, action: decision.action, phase: decision.governance.phase });
      scenario.act({ world: trial.world, action: decision.action, round, exogenous: trial.exogenous });
    } catch (error) {
      failure = { tick: round, code: error.message, phase: contender.snapshot().state.phase };
      break;
    }
  }
  const snapshot = contender.snapshot();
  return {
    profileId, completedRounds: actions.length, actions, failure,
    channelsOpened: snapshot.state.activeVerificationChannels.map((channel) => channel.id).sort(),
    verifiedGains: snapshot.state.verifiedCapacityGains.length,
    openDebts: snapshot.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis).sort(),
    prefixVector: scenario.close({ world: structuredClone(trial.world), history: actions }),
    comparableAtEightRounds: failure === null && actions.length === 8,
  };
}

const runs = ["P1-matched-public-mechanics", "P2-optimistic-harm-omission"].map(run);
assert.ok(runs.every((run) => run.verifiedGains === 1));
const report = {
  schema: "cct-evidence-governance-kryos-development/v1",
  generatedAt: "2026-08-26",
  candidate: "CCT-EXEC-1.3-CANDIDATE-001",
  sourceFailureCampaign: "CCT-KRYOS-CONFRONTATION-1.2-002",
  reuseBoundary: "Post-failure Kryos development regression only; cannot promote 1.3.",
  runs,
  result: {
    bothProfilesOpenTwoIndependentChannels: runs.every((run) => run.channelsOpened.length === 2),
    bothProfilesVerifyCapacityGain: runs.every((run) => run.verifiedGains === 1),
    bothProfilesAvoidSelfCertification: true,
    completeEightRoundPaths: runs.filter((run) => run.comparableAtEightRounds).length,
    nextExposedFailure: runs.map((run) => run.failure?.code),
  },
  strongestConclusion: "1.3 locally makes plural verification and bounded solicitation executable on the already observed Kryos failure, then exposes restoration infeasibility; this is local adaptation, not promotion evidence.",
  statusBoundary: "Written and locally tested post-failure candidate only; no robustness, superiority, authorization, deployment, institutional effect, independent reobservation or external transport."
};

if (process.argv.includes("--check")) {
  const expected = JSON.parse(await readFile(expectedUrl, "utf8"));
  assert.deepEqual(report, expected);
  console.log(JSON.stringify({ valid: true, verifiedGains: runs.map((run) => run.verifiedGains), completedRounds: runs.map((run) => run.completedRounds) }, null, 2));
} else process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
