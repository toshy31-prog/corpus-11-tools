import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  assessUncertaintyBoundedTransport,
  CctUncertaintyBoundedTransportRuntime,
  selectUncertaintyQualifiedBridge
} from "../sequenced-restoration-v3.1-uncertainty-bounded-transport/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
const PAIR_RELATIVE_TOLERANCE = 0.2;
const RISK_ABSOLUTE_TOLERANCE = 0.1;

export function validateClusterAwareTransportSpec(candidate = SPEC) {
  return candidate?.schema === "cct-cluster-aware-transport/v1"
    && candidate?.version === "3.2-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-3.1-UNCERTAINTY-BOUNDED-TRANSPORT-CANDIDATE-001"
    && candidate?.minimumClustersPerContext === 30
    && candidate?.clusterIntervalMethod === "studentized_cluster_mean"
    && candidate?.familyWiseCoverage === 0.95
    && candidate?.contextIntervals === 90
    && candidate?.adjustedTCritical === 4;
}

function clusterProtocolInput(exercise) {
  const summarize = (trial) => ({
    contextId: trial?.contextId,
    clusters: trial?.clusters?.map((cluster) => ({ clusterId: cluster?.clusterId, sampleSize: cluster?.sampleSize }))
  });
  return {
    schema: "cct-cluster-aware-transport-protocol/v1",
    minimumClustersPerContext: SPEC.minimumClustersPerContext,
    clusterIntervalMethod: SPEC.clusterIntervalMethod,
    familyWiseCoverage: SPEC.familyWiseCoverage,
    contextIntervals: SPEC.contextIntervals,
    adjustedTCritical: SPEC.adjustedTCritical,
    pairContexts: exercise?.transportEvidence?.pairMargins?.map((record) => ({ pair: record?.pair, trials: record?.trials?.map(summarize) })),
    riskContexts: exercise?.transportEvidence?.classRisks?.map((record) => ({ dependencyClass: record?.dependencyClass, trials: record?.trials?.map(summarize) }))
  };
}

export function computeClusterProtocolDigest(exercise) {
  return createHash("sha256").update(JSON.stringify(clusterProtocolInput(exercise))).digest("hex");
}

function validClusterStructure(trial, countKeys) {
  const clusters = trial?.clusters;
  if (!Array.isArray(clusters) || clusters.length < SPEC.minimumClustersPerContext
    || new Set(clusters.map((cluster) => cluster?.clusterId)).size !== clusters.length
    || clusters.some((cluster) => typeof cluster?.clusterId !== "string" || !cluster.clusterId
      || !Number.isInteger(cluster.sampleSize) || cluster.sampleSize <= 0
      || countKeys.some((key) => !Number.isInteger(cluster[key]) || cluster[key] < 0 || cluster[key] > cluster.sampleSize))) return false;
  const clusterSize = clusters[0].sampleSize;
  if (clusters.some((cluster) => cluster.sampleSize !== clusterSize)
    || clusters.reduce((sum, cluster) => sum + cluster.sampleSize, 0) !== trial.sampleSize) return false;
  return countKeys.every((key) => clusters.reduce((sum, cluster) => sum + cluster[key], 0) === trial[key]);
}

function studentizedInterval(values) {
  if (!Array.isArray(values) || values.length < SPEC.minimumClustersPerContext || values.some((value) => !Number.isFinite(value))) return null;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  const halfWidth = SPEC.adjustedTCritical * Math.sqrt(variance / values.length);
  return [mean - halfWidth, mean + halfWidth];
}

function pairClusterInterval(trial) {
  if (!validClusterStructure(trial, ["candidateAllAxesProtectedCount", "rivalAllAxesProtectedCount"])) return null;
  return studentizedInterval(trial.clusters.map((cluster) =>
    100 * (cluster.candidateAllAxesProtectedCount - cluster.rivalAllAxesProtectedCount) / cluster.sampleSize
  ));
}

function riskClusterInterval(trial) {
  if (!validClusterStructure(trial, ["failureCount"])) return null;
  return studentizedInterval(trial.clusters.map((cluster) => cluster.failureCount / cluster.sampleSize));
}

export function assessClusterAwareTransport(openDebtAxes, dependencyAudit, exercise) {
  const uncertainty = assessUncertaintyBoundedTransport(openDebtAxes, dependencyAudit, exercise);
  if (uncertainty.status !== "bounded_uncertainty_qualified_transport_candidate") return uncertainty;

  const commitment = exercise?.clusterProtocolCommitment;
  if (!validateClusterAwareTransportSpec()
    || commitment?.algorithm !== "sha256"
    || !Number.isInteger(commitment?.committedAtTick)
    || commitment.committedAtTick > exercise?.uncertaintyProtocolCommitment?.committedAtTick
    || commitment.digest !== computeClusterProtocolDigest(exercise)) {
    return { status: "not_established", failures: ["invalid_cluster_protocol"] };
  }

  const failures = [];
  for (const sourceSignal of exercise.pairSignals) {
    const pairId = sourceSignal.pair.join("+");
    const record = exercise.transportEvidence.pairMargins.find((item) => item.pair.join("+") === pairId);
    const tolerance = PAIR_RELATIVE_TOLERANCE * Math.max(Math.abs(sourceSignal.minimumMargin), 1);
    const lower = sourceSignal.minimumMargin - tolerance;
    const upper = sourceSignal.minimumMargin + tolerance;
    for (const trial of record.trials) {
      const interval = pairClusterInterval(trial);
      if (!interval) failures.push({ signalType: "pair_margin", signal: pairId, contextId: trial?.contextId, reason: "cluster_structure_invalid" });
      else if (interval[0] < lower || interval[1] > upper) failures.push({ signalType: "pair_margin", signal: pairId, contextId: trial.contextId, reason: "cluster_interval_crosses_transfer_limit" });
    }
  }

  for (const sourceSignal of exercise.classRiskScores) {
    const record = exercise.transportEvidence.classRisks.find((item) => item.dependencyClass === sourceSignal.dependencyClass);
    const lower = Math.max(0, sourceSignal.riskScore - RISK_ABSOLUTE_TOLERANCE);
    const upper = Math.min(1, sourceSignal.riskScore + RISK_ABSOLUTE_TOLERANCE);
    for (const trial of record.trials) {
      const interval = riskClusterInterval(trial);
      if (!interval) failures.push({ signalType: "class_risk", signal: sourceSignal.dependencyClass, contextId: trial?.contextId, reason: "cluster_structure_invalid" });
      else if (interval[0] < lower || interval[1] > upper) failures.push({ signalType: "class_risk", signal: sourceSignal.dependencyClass, contextId: trial.contextId, reason: "cluster_interval_crosses_transfer_limit" });
    }
  }

  return { status: failures.length === 0 ? "bounded_cluster_aware_transport_candidate" : "not_established", failures };
}

export function selectClusterQualifiedBridge(
  actionOntology, allowedActions, openDebtAxes, bridgeExercises, failoverExercises,
  commonCauseExercises, dependencyAudits, subthresholdExercises, crossClassExercises,
  tripleExercises, dualContextExercises, riskDirectedExercises, signalProvenanceExercises,
  signalTransportExercises, uncertaintyTransportExercises, clusterTransportExercises
) {
  const qualified = allowedActions.filter((action) =>
    assessClusterAwareTransport(openDebtAxes, dependencyAudits?.[action], clusterTransportExercises?.[action]).status
      === "bounded_cluster_aware_transport_candidate"
  );
  return selectUncertaintyQualifiedBridge(
    actionOntology, qualified, openDebtAxes, bridgeExercises, failoverExercises,
    commonCauseExercises, dependencyAudits, subthresholdExercises, crossClassExercises,
    tripleExercises, dualContextExercises, riskDirectedExercises, signalProvenanceExercises,
    signalTransportExercises, uncertaintyTransportExercises
  );
}

export class CctClusterAwareTransportRuntime extends CctUncertaintyBoundedTransportRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const openDebtAxes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = selectClusterQualifiedBridge(
      view?.cct?.actionOntology, allowedActions, openDebtAxes, view?.cct?.bridgeExercises,
      view?.cct?.failoverExercises, view?.cct?.commonCauseExercises, view?.cct?.dependencyAudits,
      view?.cct?.subthresholdExercises, view?.cct?.crossClassExercises, view?.cct?.tripleExercises,
      view?.cct?.dualContextExercises, view?.cct?.riskDirectedExercises,
      view?.cct?.signalProvenanceExercises, view?.cct?.signalTransportExercises,
      view?.cct?.uncertaintyTransportExercises, view?.cct?.clusterTransportExercises
    );
    if (!selected) this.terminal("CCT_SIGNAL_TRANSPORT_CLUSTER_INDEPENDENCE_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
