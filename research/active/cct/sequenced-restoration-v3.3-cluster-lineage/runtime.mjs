import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  assessClusterAwareTransport,
  CctClusterAwareTransportRuntime,
  selectClusterQualifiedBridge
} from "../sequenced-restoration-v3.2-cluster-aware-transport/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function validateClusterLineageSpec(candidate = SPEC) {
  return candidate?.schema === "cct-cluster-lineage/v1"
    && candidate?.version === "3.3-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-3.2-CLUSTER-AWARE-TRANSPORT-CANDIDATE-001"
    && JSON.stringify(candidate?.uniqueRoots) === JSON.stringify(["samplingUnitRoot", "eventRoot", "generatorRoot"])
    && candidate?.minimumControllersPerContext === 2
    && candidate?.minimumFailureDomainsPerContext === 2
    && candidate?.maximumControllerShare === 0.5
    && candidate?.maximumFailureDomainShare === 0.5;
}

function lineageProtocolInput(exercise) {
  const summarize = (trial) => ({
    contextId: trial?.contextId,
    clusters: trial?.clusters?.map((cluster) => ({
      clusterId: cluster?.clusterId,
      samplingUnitRoot: cluster?.samplingUnitRoot,
      eventRoot: cluster?.eventRoot,
      generatorRoot: cluster?.generatorRoot,
      controller: cluster?.controller,
      failureDomain: cluster?.failureDomain
    }))
  });
  return {
    schema: "cct-cluster-lineage-protocol/v1",
    uniqueRoots: SPEC.uniqueRoots,
    minimumControllersPerContext: SPEC.minimumControllersPerContext,
    minimumFailureDomainsPerContext: SPEC.minimumFailureDomainsPerContext,
    maximumControllerShare: SPEC.maximumControllerShare,
    maximumFailureDomainShare: SPEC.maximumFailureDomainShare,
    pairContexts: exercise?.transportEvidence?.pairMargins?.map((record) => ({ pair: record?.pair, trials: record?.trials?.map(summarize) })),
    riskContexts: exercise?.transportEvidence?.classRisks?.map((record) => ({ dependencyClass: record?.dependencyClass, trials: record?.trials?.map(summarize) }))
  };
}

export function computeClusterLineageProtocolDigest(exercise) {
  return createHash("sha256").update(JSON.stringify(lineageProtocolInput(exercise))).digest("hex");
}

function maximumShare(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Math.max(...counts.values()) / values.length;
}

function contextLineageValid(trial) {
  const clusters = trial?.clusters;
  if (!Array.isArray(clusters) || clusters.length === 0) return false;
  for (const field of [...SPEC.uniqueRoots, "controller", "failureDomain"]) {
    if (clusters.some((cluster) => typeof cluster?.[field] !== "string" || !cluster[field])) return false;
  }
  const controllers = clusters.map((cluster) => cluster.controller);
  const failureDomains = clusters.map((cluster) => cluster.failureDomain);
  return new Set(controllers).size >= SPEC.minimumControllersPerContext
    && new Set(failureDomains).size >= SPEC.minimumFailureDomainsPerContext
    && maximumShare(controllers) <= SPEC.maximumControllerShare
    && maximumShare(failureDomains) <= SPEC.maximumFailureDomainShare;
}

function signalLineageValid(trials) {
  if (!Array.isArray(trials) || trials.some((trial) => !contextLineageValid(trial))) return false;
  const clusters = trials.flatMap((trial) => trial.clusters);
  return SPEC.uniqueRoots.every((field) => new Set(clusters.map((cluster) => cluster[field])).size === clusters.length);
}

export function assessClusterLineageTransport(openDebtAxes, dependencyAudit, exercise) {
  const clustered = assessClusterAwareTransport(openDebtAxes, dependencyAudit, exercise);
  if (clustered.status !== "bounded_cluster_aware_transport_candidate") return clustered;

  const commitment = exercise?.clusterLineageProtocolCommitment;
  if (!validateClusterLineageSpec()
    || commitment?.algorithm !== "sha256"
    || !Number.isInteger(commitment?.committedAtTick)
    || commitment.committedAtTick > exercise?.clusterProtocolCommitment?.committedAtTick
    || commitment.digest !== computeClusterLineageProtocolDigest(exercise)) {
    return { status: "not_established", failures: ["invalid_cluster_lineage_protocol"] };
  }

  const failures = [];
  for (const record of exercise.transportEvidence.pairMargins) {
    if (!signalLineageValid(record.trials)) failures.push({ signalType: "pair_margin", signal: record.pair.join("+"), reason: "cluster_lineage_dependent" });
  }
  for (const record of exercise.transportEvidence.classRisks) {
    if (!signalLineageValid(record.trials)) failures.push({ signalType: "class_risk", signal: record.dependencyClass, reason: "cluster_lineage_dependent" });
  }
  return { status: failures.length === 0 ? "bounded_cluster_lineage_transport_candidate" : "not_established", failures };
}

export function selectClusterLineageQualifiedBridge(
  actionOntology, allowedActions, openDebtAxes, bridgeExercises, failoverExercises,
  commonCauseExercises, dependencyAudits, subthresholdExercises, crossClassExercises,
  tripleExercises, dualContextExercises, riskDirectedExercises, signalProvenanceExercises,
  signalTransportExercises, uncertaintyTransportExercises, clusterTransportExercises,
  clusterLineageExercises
) {
  const qualified = allowedActions.filter((action) =>
    assessClusterLineageTransport(openDebtAxes, dependencyAudits?.[action], clusterLineageExercises?.[action]).status
      === "bounded_cluster_lineage_transport_candidate"
  );
  return selectClusterQualifiedBridge(
    actionOntology, qualified, openDebtAxes, bridgeExercises, failoverExercises,
    commonCauseExercises, dependencyAudits, subthresholdExercises, crossClassExercises,
    tripleExercises, dualContextExercises, riskDirectedExercises, signalProvenanceExercises,
    signalTransportExercises, uncertaintyTransportExercises, clusterTransportExercises
  );
}

export class CctClusterLineageRuntime extends CctClusterAwareTransportRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const openDebtAxes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = selectClusterLineageQualifiedBridge(
      view?.cct?.actionOntology, allowedActions, openDebtAxes, view?.cct?.bridgeExercises,
      view?.cct?.failoverExercises, view?.cct?.commonCauseExercises, view?.cct?.dependencyAudits,
      view?.cct?.subthresholdExercises, view?.cct?.crossClassExercises, view?.cct?.tripleExercises,
      view?.cct?.dualContextExercises, view?.cct?.riskDirectedExercises,
      view?.cct?.signalProvenanceExercises, view?.cct?.signalTransportExercises,
      view?.cct?.uncertaintyTransportExercises, view?.cct?.clusterTransportExercises,
      view?.cct?.clusterLineageExercises
    );
    if (!selected) this.terminal("CCT_SIGNAL_TRANSPORT_CLUSTER_LINEAGE_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
