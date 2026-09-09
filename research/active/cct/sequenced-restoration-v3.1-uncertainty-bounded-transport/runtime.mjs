import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { REQUIRED_DEPENDENCY_CLASSES } from "../sequenced-restoration-v2.3-dependency-detectability/runtime.mjs";
import { requiredClassPairs } from "../sequenced-restoration-v2.5-cross-class-pairs/runtime.mjs";
import {
  assessHeldOutSignalTransport,
  CctHeldOutSignalTransportRuntime,
  selectTransportQualifiedBridge
} from "../sequenced-restoration-v3.0-held-out-signal-transport/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
const PAIR_RELATIVE_TOLERANCE = 0.2;
const RISK_ABSOLUTE_TOLERANCE = 0.1;

export function validateUncertaintyBoundedTransportSpec(candidate = SPEC) {
  return candidate?.schema === "cct-uncertainty-bounded-transport/v1"
    && candidate?.version === "3.1-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-3.0-HELD-OUT-SIGNAL-TRANSPORT-CANDIDATE-001"
    && candidate?.intervalMethod === "wilson_score"
    && candidate?.familyWiseCoverage === 0.95
    && candidate?.elementaryProportionIntervals === 162
    && candidate?.adjustedZCritical === 3.62
    && candidate?.targetContextsPerSignal === 2;
}

function uncertaintyProtocolInput(exercise) {
  const evidence = exercise?.transportEvidence;
  return {
    schema: "cct-uncertainty-bounded-transport-protocol/v1",
    intervalMethod: SPEC.intervalMethod,
    familyWiseCoverage: SPEC.familyWiseCoverage,
    elementaryProportionIntervals: SPEC.elementaryProportionIntervals,
    adjustedZCritical: SPEC.adjustedZCritical,
    targetContextsPerSignal: SPEC.targetContextsPerSignal,
    pairContexts: evidence?.pairMargins?.map((record) => ({
      pair: record?.pair,
      contextIds: record?.trials?.map((trial) => trial?.contextId)
    })),
    riskContexts: evidence?.classRisks?.map((record) => ({
      dependencyClass: record?.dependencyClass,
      contextIds: record?.trials?.map((trial) => trial?.contextId)
    }))
  };
}

export function computeUncertaintyProtocolDigest(exercise) {
  return createHash("sha256").update(JSON.stringify(uncertaintyProtocolInput(exercise))).digest("hex");
}

function wilsonInterval(count, sampleSize, z = SPEC.adjustedZCritical) {
  if (!Number.isInteger(count) || !Number.isInteger(sampleSize) || sampleSize <= 0 || count < 0 || count > sampleSize) return null;
  const proportion = count / sampleSize;
  const zSquared = z * z;
  const denominator = 1 + zSquared / sampleSize;
  const center = (proportion + zSquared / (2 * sampleSize)) / denominator;
  const halfWidth = z * Math.sqrt(proportion * (1 - proportion) / sampleSize + zSquared / (4 * sampleSize * sampleSize)) / denominator;
  return [Math.max(0, center - halfWidth), Math.min(1, center + halfWidth)];
}

function pairMarginInterval(trial) {
  const candidate = wilsonInterval(trial?.candidateAllAxesProtectedCount, trial?.sampleSize);
  const rival = wilsonInterval(trial?.rivalAllAxesProtectedCount, trial?.sampleSize);
  return candidate && rival ? [100 * (candidate[0] - rival[1]), 100 * (candidate[1] - rival[0])] : null;
}

function recordSetIsExact(records, identifiers) {
  return Array.isArray(records)
    && records.length === identifiers.length
    && new Set(records.map((record) => record.id)).size === identifiers.length
    && records.every((record) => identifiers.includes(record.id) && Array.isArray(record.trials) && record.trials.length === 2);
}

export function assessUncertaintyBoundedTransport(openDebtAxes, dependencyAudit, exercise) {
  const transport = assessHeldOutSignalTransport(openDebtAxes, dependencyAudit, exercise);
  if (transport.status !== "bounded_held_out_signal_transport_candidate") return transport;

  const commitment = exercise?.uncertaintyProtocolCommitment;
  if (!validateUncertaintyBoundedTransportSpec()
    || commitment?.algorithm !== "sha256"
    || !Number.isInteger(commitment?.committedAtTick)
    || commitment.committedAtTick > exercise?.transportProtocolCommitment?.committedAtTick
    || commitment.digest !== computeUncertaintyProtocolDigest(exercise)) {
    return { status: "not_established", failures: ["invalid_uncertainty_protocol"] };
  }

  const pairRecords = exercise.transportEvidence.pairMargins.map((record) => ({ id: record?.pair?.join("+"), trials: record?.trials }));
  const riskRecords = exercise.transportEvidence.classRisks.map((record) => ({ id: record?.dependencyClass, trials: record?.trials }));
  const pairIds = requiredClassPairs().map((pair) => pair.join("+"));
  if (!recordSetIsExact(pairRecords, pairIds) || !recordSetIsExact(riskRecords, REQUIRED_DEPENDENCY_CLASSES)) {
    return { status: "not_established", failures: ["uncertainty_family_not_exact"] };
  }

  const failures = [];
  for (const sourceSignal of exercise.pairSignals) {
    const pairId = sourceSignal.pair.join("+");
    const record = pairRecords.find((item) => item.id === pairId);
    const tolerance = PAIR_RELATIVE_TOLERANCE * Math.max(Math.abs(sourceSignal.minimumMargin), 1);
    const lower = sourceSignal.minimumMargin - tolerance;
    const upper = sourceSignal.minimumMargin + tolerance;
    for (const trial of record.trials) {
      const interval = pairMarginInterval(trial);
      if (!interval || interval[0] < lower || interval[1] > upper) {
        failures.push({ signalType: "pair_margin", signal: pairId, contextId: trial?.contextId, reason: "uncertainty_interval_crosses_transfer_limit" });
      }
    }
  }

  for (const sourceSignal of exercise.classRiskScores) {
    const record = riskRecords.find((item) => item.id === sourceSignal.dependencyClass);
    const lower = Math.max(0, sourceSignal.riskScore - RISK_ABSOLUTE_TOLERANCE);
    const upper = Math.min(1, sourceSignal.riskScore + RISK_ABSOLUTE_TOLERANCE);
    for (const trial of record.trials) {
      const interval = wilsonInterval(trial?.failureCount, trial?.sampleSize);
      if (!interval || interval[0] < lower || interval[1] > upper) {
        failures.push({ signalType: "class_risk", signal: sourceSignal.dependencyClass, contextId: trial?.contextId, reason: "uncertainty_interval_crosses_transfer_limit" });
      }
    }
  }

  return {
    status: failures.length === 0 ? "bounded_uncertainty_qualified_transport_candidate" : "not_established",
    failures
  };
}

export function selectUncertaintyQualifiedBridge(
  actionOntology, allowedActions, openDebtAxes, bridgeExercises, failoverExercises,
  commonCauseExercises, dependencyAudits, subthresholdExercises, crossClassExercises,
  tripleExercises, dualContextExercises, riskDirectedExercises, signalProvenanceExercises,
  signalTransportExercises, uncertaintyTransportExercises
) {
  const qualified = allowedActions.filter((action) =>
    assessUncertaintyBoundedTransport(openDebtAxes, dependencyAudits?.[action], uncertaintyTransportExercises?.[action]).status
      === "bounded_uncertainty_qualified_transport_candidate"
  );
  return selectTransportQualifiedBridge(
    actionOntology, qualified, openDebtAxes, bridgeExercises, failoverExercises,
    commonCauseExercises, dependencyAudits, subthresholdExercises, crossClassExercises,
    tripleExercises, dualContextExercises, riskDirectedExercises, signalProvenanceExercises,
    signalTransportExercises
  );
}

export class CctUncertaintyBoundedTransportRuntime extends CctHeldOutSignalTransportRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const openDebtAxes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = selectUncertaintyQualifiedBridge(
      view?.cct?.actionOntology, allowedActions, openDebtAxes, view?.cct?.bridgeExercises,
      view?.cct?.failoverExercises, view?.cct?.commonCauseExercises, view?.cct?.dependencyAudits,
      view?.cct?.subthresholdExercises, view?.cct?.crossClassExercises, view?.cct?.tripleExercises,
      view?.cct?.dualContextExercises, view?.cct?.riskDirectedExercises,
      view?.cct?.signalProvenanceExercises, view?.cct?.signalTransportExercises,
      view?.cct?.uncertaintyTransportExercises
    );
    if (!selected) this.terminal("CCT_SIGNAL_TRANSPORT_UNCERTAINTY_UNRESOLVED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
