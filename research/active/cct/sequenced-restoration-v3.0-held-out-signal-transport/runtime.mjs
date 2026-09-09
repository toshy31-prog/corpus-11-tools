import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { REQUIRED_DEPENDENCY_CLASSES } from "../sequenced-restoration-v2.3-dependency-detectability/runtime.mjs";
import { requiredClassPairs } from "../sequenced-restoration-v2.5-cross-class-pairs/runtime.mjs";
import { deriveRiskDirectedSchedule } from "../sequenced-restoration-v2.8-risk-directed-context/runtime.mjs";
import {
  assessSignalProvenance,
  CctSignalProvenanceRuntime,
  selectProvenancedSignalQualifiedBridge
} from "../sequenced-restoration-v2.9-signal-provenance/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
const PAIR_TARGET_SCHEMA = "axis-protection-contrast/v1";
const RISK_TARGET_SCHEMA = "dependency-failure-frequency/v1";

export function validateHeldOutSignalTransportSpec(candidate = SPEC) {
  return candidate?.schema === "cct-held-out-signal-transport/v1"
    && candidate?.version === "3.0-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-2.9-SIGNAL-PROVENANCE-CANDIDATE-001";
}

function protocolInput(transportEvidence) {
  const stripOutcomes = (trial) => ({
    schema: trial?.schema,
    contextId: trial?.contextId,
    contextRoot: trial?.contextRoot,
    controller: trial?.controller,
    failureDomain: trial?.failureDomain,
    observedAtTick: trial?.observedAtTick,
    sampleSize: trial?.sampleSize
  });
  return {
    schema: "cct-held-out-signal-transport-protocol/v1",
    constructs: transportEvidence?.constructs,
    pairMargins: transportEvidence?.pairMargins?.map((record) => ({ pair: record?.pair, trials: record?.trials?.map(stripOutcomes) })),
    classRisks: transportEvidence?.classRisks?.map((record) => ({ dependencyClass: record?.dependencyClass, trials: record?.trials?.map(stripOutcomes) }))
  };
}

export function computeTransportProtocolDigest(transportEvidence) {
  return createHash("sha256").update(JSON.stringify(protocolInput(transportEvidence))).digest("hex");
}

function exactMembers(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length && actual.every((item, index) => item === expected[index]);
}

function validConstructs(constructs, openDebtAxes) {
  return constructs?.pairMargin?.schema === PAIR_TARGET_SCHEMA
    && constructs.pairMargin.construct === "all_open_debt_axes_protected_rate_difference"
    && constructs.pairMargin.unit === "percentage_points"
    && exactMembers(constructs.pairMargin.openDebtAxes, openDebtAxes)
    && constructs?.classRisk?.schema === RISK_TARGET_SCHEMA
    && constructs.classRisk.construct === "dependency_failure_frequency"
    && constructs.classRisk.unit === "proportion";
}

function sourceCoordinates(signalRecord) {
  const attestations = signalRecord?.attestations ?? [];
  return {
    roots: new Set(attestations.map((item) => item.sourceRoot)),
    controllers: new Set(attestations.map((item) => item.controller)),
    failureDomains: new Set(attestations.map((item) => item.failureDomain))
  };
}

function independentHeldOutTrials(trials, source, commitmentTick, firstExerciseTick, schema) {
  return Array.isArray(trials)
    && trials.length >= 2
    && new Set(trials.map((item) => item.contextRoot)).size >= 2
    && new Set(trials.map((item) => item.controller)).size >= 2
    && new Set(trials.map((item) => item.failureDomain)).size >= 2
    && trials.every((trial) => trial?.schema === schema
      && typeof trial.contextId === "string" && trial.contextId
      && typeof trial.contextRoot === "string" && trial.contextRoot && !source.roots.has(trial.contextRoot)
      && typeof trial.controller === "string" && trial.controller && !source.controllers.has(trial.controller)
      && typeof trial.failureDomain === "string" && trial.failureDomain && !source.failureDomains.has(trial.failureDomain)
      && Number.isInteger(trial.observedAtTick) && trial.observedAtTick > commitmentTick && trial.observedAtTick < firstExerciseTick
      && Number.isInteger(trial.sampleSize) && trial.sampleSize >= 100);
}

function pairOutcome(trial) {
  if (!Number.isInteger(trial?.candidateAllAxesProtectedCount)
    || !Number.isInteger(trial?.rivalAllAxesProtectedCount)
    || trial.candidateAllAxesProtectedCount < 0 || trial.rivalAllAxesProtectedCount < 0
    || trial.candidateAllAxesProtectedCount > trial.sampleSize || trial.rivalAllAxesProtectedCount > trial.sampleSize) return null;
  return 100 * (trial.candidateAllAxesProtectedCount - trial.rivalAllAxesProtectedCount) / trial.sampleSize;
}

function riskOutcome(trial) {
  if (!Number.isInteger(trial?.failureCount) || trial.failureCount < 0 || trial.failureCount > trial.sampleSize) return null;
  return trial.failureCount / trial.sampleSize;
}

export function assessHeldOutSignalTransport(openDebtAxes, dependencyAudit, exercise) {
  const provenance = assessSignalProvenance(openDebtAxes, dependencyAudit, exercise);
  if (provenance.status !== "bounded_provenanced_risk_signals_candidate") return provenance;

  const evidence = exercise?.transportEvidence;
  const commitment = exercise?.transportProtocolCommitment;
  const firstExerciseTick = exercise?.firstExerciseTick;
  if (!validConstructs(evidence?.constructs, openDebtAxes)
    || !Number.isInteger(commitment?.committedAtTick)
    || commitment.committedAtTick > exercise?.planCommitment?.committedAtTick
    || commitment.algorithm !== "sha256"
    || commitment.digest !== computeTransportProtocolDigest(evidence)
    || !Number.isInteger(firstExerciseTick)) {
    return { status: "not_established", failures: ["invalid_transport_protocol"] };
  }

  const failures = [];
  const targetPairSignals = [];
  const pairIds = requiredClassPairs().map((pair) => pair.join("+"));
  for (const sourceSignal of exercise.pairSignals) {
    const pairId = sourceSignal.pair.join("+");
    const sourceRecord = exercise.signalEvidence.pairMargins.find((item) => item.pair.join("+") === pairId);
    const targetRecord = evidence.pairMargins?.find((item) => item?.pair?.join("+") === pairId);
    const trials = targetRecord?.trials;
    if (!independentHeldOutTrials(trials, sourceCoordinates(sourceRecord), commitment.committedAtTick, firstExerciseTick, PAIR_TARGET_SCHEMA)) {
      failures.push({ signalType: "pair_margin", signal: pairId, reason: "held_out_contexts_missing" });
      continue;
    }
    const outcomes = trials.map(pairOutcome);
    const maximumError = outcomes.some((value) => value === null || value < 0)
      ? Infinity
      : Math.max(...outcomes.map((value) => Math.abs(value - sourceSignal.minimumMargin) / Math.max(Math.abs(sourceSignal.minimumMargin), 1)));
    if (maximumError > 0.2) {
      failures.push({ signalType: "pair_margin", signal: pairId, reason: "transfer_error_exceeded" });
      continue;
    }
    targetPairSignals.push({ pair: sourceSignal.pair, minimumMargin: Math.min(...outcomes), sourceRoot: sourceSignal.sourceRoot });
  }
  if (!Array.isArray(evidence?.pairMargins) || evidence.pairMargins.length !== pairIds.length
    || new Set(evidence.pairMargins.map((item) => item?.pair?.join("+"))).size !== pairIds.length) {
    failures.push({ signalType: "pair_margin", reason: "target_evidence_set_not_exact" });
  }

  const targetClassRisks = [];
  for (const sourceSignal of exercise.classRiskScores) {
    const dependencyClass = sourceSignal.dependencyClass;
    const sourceRecord = exercise.signalEvidence.classRisks.find((item) => item.dependencyClass === dependencyClass);
    const targetRecord = evidence.classRisks?.find((item) => item?.dependencyClass === dependencyClass);
    const trials = targetRecord?.trials;
    if (!independentHeldOutTrials(trials, sourceCoordinates(sourceRecord), commitment.committedAtTick, firstExerciseTick, RISK_TARGET_SCHEMA)) {
      failures.push({ signalType: "class_risk", signal: dependencyClass, reason: "held_out_contexts_missing" });
      continue;
    }
    const outcomes = trials.map(riskOutcome);
    const maximumError = outcomes.some((value) => value === null)
      ? Infinity
      : Math.max(...outcomes.map((value) => Math.abs(value - sourceSignal.riskScore)));
    if (maximumError > 0.1) {
      failures.push({ signalType: "class_risk", signal: dependencyClass, reason: "transfer_error_exceeded" });
      continue;
    }
    targetClassRisks.push({ dependencyClass, riskScore: Math.max(...outcomes), sourceRoot: sourceSignal.sourceRoot });
  }
  if (!Array.isArray(evidence?.classRisks) || evidence.classRisks.length !== REQUIRED_DEPENDENCY_CLASSES.length
    || new Set(evidence.classRisks.map((item) => item?.dependencyClass)).size !== REQUIRED_DEPENDENCY_CLASSES.length) {
    failures.push({ signalType: "class_risk", reason: "target_evidence_set_not_exact" });
  }

  if (failures.length === 0) {
    const sourceSchedule = deriveRiskDirectedSchedule(exercise.pairSignals, exercise.classRiskScores, exercise.pairBudget);
    const targetSchedule = deriveRiskDirectedSchedule(targetPairSignals, targetClassRisks, exercise.pairBudget);
    if (JSON.stringify(sourceSchedule) !== JSON.stringify(targetSchedule)) failures.push("target_schedule_diverged");
  }
  return { status: failures.length === 0 ? "bounded_held_out_signal_transport_candidate" : "not_established", failures };
}

export function selectTransportQualifiedBridge(
  actionOntology, allowedActions, openDebtAxes, bridgeExercises, failoverExercises,
  commonCauseExercises, dependencyAudits, subthresholdExercises, crossClassExercises,
  tripleExercises, dualContextExercises, riskDirectedExercises, signalProvenanceExercises,
  signalTransportExercises
) {
  const qualified = allowedActions.filter((action) =>
    assessHeldOutSignalTransport(openDebtAxes, dependencyAudits?.[action], signalTransportExercises?.[action]).status
      === "bounded_held_out_signal_transport_candidate"
  );
  return selectProvenancedSignalQualifiedBridge(
    actionOntology, qualified, openDebtAxes, bridgeExercises, failoverExercises,
    commonCauseExercises, dependencyAudits, subthresholdExercises, crossClassExercises,
    tripleExercises, dualContextExercises, riskDirectedExercises, signalProvenanceExercises
  );
}

export class CctHeldOutSignalTransportRuntime extends CctSignalProvenanceRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const openDebtAxes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = selectTransportQualifiedBridge(
      view?.cct?.actionOntology, allowedActions, openDebtAxes, view?.cct?.bridgeExercises,
      view?.cct?.failoverExercises, view?.cct?.commonCauseExercises, view?.cct?.dependencyAudits,
      view?.cct?.subthresholdExercises, view?.cct?.crossClassExercises, view?.cct?.tripleExercises,
      view?.cct?.dualContextExercises, view?.cct?.riskDirectedExercises,
      view?.cct?.signalProvenanceExercises, view?.cct?.signalTransportExercises
    );
    if (!selected) this.terminal("CCT_ADAPTIVE_SIGNAL_TRANSPORT_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
