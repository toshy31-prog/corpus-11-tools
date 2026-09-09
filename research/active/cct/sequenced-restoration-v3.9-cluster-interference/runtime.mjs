import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  assessRandomizedPerturbationAssignment,
  CctRandomizedPerturbationAssignmentRuntime,
  selectRandomizedAssignmentQualifiedBridge
} from "../sequenced-restoration-v3.8-randomized-perturbation-assignment/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function validateClusterInterferenceSpec(candidate = SPEC) {
  return candidate?.schema === "cct-cluster-interference/v1"
    && candidate?.version === "3.9-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-3.8-RANDOMIZED-PERTURBATION-ASSIGNMENT-CANDIDATE-001"
    && candidate?.clustersPerProbe === 40
    && candidate?.clustersPerArm === 20
    && candidate?.maximumCrossArmExposure === 0.05;
}

function probes(exercise) {
  return exercise?.crossSignalPerturbations?.flatMap((challenge) =>
    challenge?.probes?.map((probe) => ({ challenge, probe })) ?? []
  ) ?? [];
}

function interferenceProtocolInput(exercise) {
  return {
    schema: "cct-cluster-interference-protocol/v1",
    clustersPerProbe: SPEC.clustersPerProbe,
    clustersPerArm: SPEC.clustersPerArm,
    maximumCrossArmExposure: SPEC.maximumCrossArmExposure,
    probes: probes(exercise).map(({ challenge, probe }) => ({
      target: `${challenge?.signalType}:${challenge?.signal}`,
      probeId: probe?.probeId,
      method: probe?.clusterAssignment?.method,
      controller: probe?.clusterAssignment?.controller,
      failureDomain: probe?.clusterAssignment?.failureDomain,
      plannedExposureTick: probe?.clusterAssignment?.plannedExposureTick,
      clusters: probe?.clusterAssignment?.clusters?.map((cluster) => ({
        clusterRoot: cluster?.clusterRoot,
        networkBoundaryRoot: cluster?.networkBoundaryRoot,
        arm: cluster?.arm,
        memberCount: cluster?.memberCount
      }))
    }))
  };
}

export function computeClusterInterferenceProtocolDigest(exercise) {
  return createHash("sha256").update(JSON.stringify(interferenceProtocolInput(exercise))).digest("hex");
}

function validProbeClusters(probe, protocolTick) {
  const assignment = probe?.clusterAssignment;
  const clusters = assignment?.clusters;
  if (assignment?.method !== "cluster_blocked_randomized"
    || typeof assignment.controller !== "string" || !assignment.controller || assignment.controller === probe.controller
    || typeof assignment.failureDomain !== "string" || !assignment.failureDomain || assignment.failureDomain === probe.failureDomain
    || !Number.isInteger(assignment.plannedExposureTick)
    || !Number.isInteger(assignment.observedExposureTick)
    || assignment.observedExposureTick !== assignment.plannedExposureTick
    || assignment.observedExposureTick <= protocolTick
    || assignment.observedExposureTick >= probe.observedAtTick
    || !Array.isArray(clusters) || clusters.length !== SPEC.clustersPerProbe
    || new Set(clusters.map((cluster) => cluster?.clusterRoot)).size !== SPEC.clustersPerProbe
    || new Set(clusters.map((cluster) => cluster?.networkBoundaryRoot)).size !== SPEC.clustersPerProbe) return false;

  const memberCount = clusters[0]?.memberCount;
  if (!Number.isInteger(memberCount) || memberCount <= 0
    || clusters.some((cluster) => !["baseline", "perturbed"].includes(cluster?.arm)
      || cluster.memberCount !== memberCount
      || !Number.isInteger(cluster.crossArmExposureCount)
      || cluster.crossArmExposureCount < 0 || cluster.crossArmExposureCount > cluster.memberCount
      || cluster.crossArmExposureCount / cluster.memberCount > SPEC.maximumCrossArmExposure)) return false;
  const baseline = clusters.filter((cluster) => cluster.arm === "baseline");
  const perturbed = clusters.filter((cluster) => cluster.arm === "perturbed");
  if (baseline.length !== SPEC.clustersPerArm || perturbed.length !== SPEC.clustersPerArm) return false;
  const baselineMembers = baseline.reduce((sum, cluster) => sum + cluster.memberCount, 0);
  const perturbedMembers = perturbed.reduce((sum, cluster) => sum + cluster.memberCount, 0);
  return probe.effects.every((effect) => effect.baseline.sampleSize === baselineMembers && effect.perturbed.sampleSize === perturbedMembers);
}

export function assessClusterInterference(openDebtAxes, dependencyAudit, exercise) {
  const randomized = assessRandomizedPerturbationAssignment(openDebtAxes, dependencyAudit, exercise);
  if (randomized.status !== "bounded_randomized_perturbation_assignment_candidate") return randomized;

  const commitment = exercise?.clusterInterferenceCommitment;
  if (!validateClusterInterferenceSpec()
    || commitment?.algorithm !== "sha256"
    || !Number.isInteger(commitment?.committedAtTick)
    || commitment.committedAtTick > exercise?.assignmentProtocolCommitment?.committedAtTick
    || commitment.digest !== computeClusterInterferenceProtocolDigest(exercise)) {
    return { status: "not_established", failures: ["invalid_cluster_interference_protocol"] };
  }

  const failures = [];
  const clusterRoots = [];
  const boundaryRoots = [];
  for (const { challenge, probe } of probes(exercise)) {
    if (!validProbeClusters(probe, commitment.committedAtTick)) {
      failures.push({ signal: `${challenge.signalType}:${challenge.signal}`, probeId: probe.probeId, reason: "cluster_interference_or_reconciliation_invalid" });
    } else {
      clusterRoots.push(...probe.clusterAssignment.clusters.map((cluster) => cluster.clusterRoot));
      boundaryRoots.push(...probe.clusterAssignment.clusters.map((cluster) => cluster.networkBoundaryRoot));
    }
  }
  if (new Set(clusterRoots).size !== clusterRoots.length || new Set(boundaryRoots).size !== boundaryRoots.length) {
    failures.push({ reason: "interference_cluster_lineage_reused" });
  }
  return { status: failures.length === 0 ? "bounded_cluster_interference_candidate" : "not_established", failures };
}

export function selectClusterInterferenceQualifiedBridge(
  actionOntology, allowedActions, openDebtAxes, bridgeExercises, failoverExercises,
  commonCauseExercises, dependencyAudits, subthresholdExercises, crossClassExercises,
  tripleExercises, dualContextExercises, riskDirectedExercises, signalProvenanceExercises,
  signalTransportExercises, uncertaintyTransportExercises, clusterTransportExercises,
  clusterLineageExercises, portfolioLineageExercises, lineageAttestationExercises,
  crossSignalPerturbationExercises, observedPerturbationExercises, randomizedAssignmentExercises,
  clusterInterferenceExercises
) {
  const qualified = allowedActions.filter((action) =>
    assessClusterInterference(openDebtAxes, dependencyAudits?.[action], clusterInterferenceExercises?.[action]).status
      === "bounded_cluster_interference_candidate"
  );
  return selectRandomizedAssignmentQualifiedBridge(
    actionOntology, qualified, openDebtAxes, bridgeExercises, failoverExercises,
    commonCauseExercises, dependencyAudits, subthresholdExercises, crossClassExercises,
    tripleExercises, dualContextExercises, riskDirectedExercises, signalProvenanceExercises,
    signalTransportExercises, uncertaintyTransportExercises, clusterTransportExercises,
    clusterLineageExercises, portfolioLineageExercises, lineageAttestationExercises,
    crossSignalPerturbationExercises, observedPerturbationExercises, randomizedAssignmentExercises
  );
}

export class CctClusterInterferenceRuntime extends CctRandomizedPerturbationAssignmentRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const openDebtAxes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = selectClusterInterferenceQualifiedBridge(
      view?.cct?.actionOntology, allowedActions, openDebtAxes, view?.cct?.bridgeExercises,
      view?.cct?.failoverExercises, view?.cct?.commonCauseExercises, view?.cct?.dependencyAudits,
      view?.cct?.subthresholdExercises, view?.cct?.crossClassExercises, view?.cct?.tripleExercises,
      view?.cct?.dualContextExercises, view?.cct?.riskDirectedExercises,
      view?.cct?.signalProvenanceExercises, view?.cct?.signalTransportExercises,
      view?.cct?.uncertaintyTransportExercises, view?.cct?.clusterTransportExercises,
      view?.cct?.clusterLineageExercises, view?.cct?.portfolioLineageExercises,
      view?.cct?.lineageAttestationExercises, view?.cct?.crossSignalPerturbationExercises,
      view?.cct?.observedPerturbationExercises, view?.cct?.randomizedAssignmentExercises,
      view?.cct?.clusterInterferenceExercises
    );
    if (!selected) this.terminal("CCT_PERTURBATION_INTERFERENCE_UNRESOLVED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
