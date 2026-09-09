import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  assessClusterInterference,
  CctClusterInterferenceRuntime,
  selectClusterInterferenceQualifiedBridge
} from "../sequenced-restoration-v3.9-cluster-interference/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function validateReproducibleClusterRandomizationSpec(candidate = SPEC) {
  return candidate?.schema === "cct-reproducible-cluster-randomization/v1"
    && candidate?.version === "4.0-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-3.9-CLUSTER-INTERFERENCE-CANDIDATE-001"
    && candidate?.algorithm === "sha256_rank_within_pairs"
    && candidate?.strataPerProbe === 20
    && candidate?.clustersPerStratum === 2;
}

function probes(exercise) {
  return exercise?.crossSignalPerturbations?.flatMap((challenge) =>
    challenge?.probes?.map((probe) => ({ challenge, probe })) ?? []
  ) ?? [];
}

function randomizationProtocolInput(exercise) {
  return {
    schema: "cct-reproducible-cluster-randomization-protocol/v1",
    algorithm: SPEC.algorithm,
    strataPerProbe: SPEC.strataPerProbe,
    clustersPerStratum: SPEC.clustersPerStratum,
    probes: probes(exercise).map(({ challenge, probe }) => ({
      target: `${challenge?.signalType}:${challenge?.signal}`,
      probeId: probe?.probeId,
      algorithm: probe?.clusterRandomization?.algorithm,
      seedCommitment: probe?.clusterRandomization?.seedCommitment,
      controller: probe?.clusterRandomization?.controller,
      failureDomain: probe?.clusterRandomization?.failureDomain,
      clusters: probe?.clusterAssignment?.clusters?.map((cluster) => ({
        clusterRoot: cluster?.clusterRoot,
        stratum: cluster?.stratum
      }))
    }))
  };
}

export function computeClusterRandomizationProtocolDigest(exercise) {
  return createHash("sha256").update(JSON.stringify(randomizationProtocolInput(exercise))).digest("hex");
}

export function computeClusterSeedCommitment(seedReveal) {
  return createHash("sha256").update(seedReveal).digest("hex");
}

export function deriveClusterArms(clusters, seedReveal) {
  const groups = new Map();
  for (const cluster of clusters ?? []) {
    if (!groups.has(cluster.stratum)) groups.set(cluster.stratum, []);
    groups.get(cluster.stratum).push(cluster);
  }
  if (groups.size !== SPEC.strataPerProbe || [...groups.values()].some((group) => group.length !== SPEC.clustersPerStratum)) return null;
  const arms = new Map();
  for (const [stratum, group] of groups) {
    const ranked = [...group].sort((left, right) => {
      const leftRank = createHash("sha256").update(`${seedReveal}|${stratum}|${left.clusterRoot}`).digest("hex");
      const rightRank = createHash("sha256").update(`${seedReveal}|${stratum}|${right.clusterRoot}`).digest("hex");
      return leftRank.localeCompare(rightRank);
    });
    arms.set(ranked[0].clusterRoot, "baseline");
    arms.set(ranked[1].clusterRoot, "perturbed");
  }
  return arms;
}

function validReproducibleProbe(probe, protocolTick, parentCommitmentTick) {
  const randomization = probe?.clusterRandomization;
  const clusters = probe?.clusterAssignment?.clusters;
  if (randomization?.algorithm !== SPEC.algorithm
    || typeof randomization.seedReveal !== "string" || !randomization.seedReveal
    || computeClusterSeedCommitment(randomization.seedReveal) !== randomization.seedCommitment
    || typeof randomization.controller !== "string" || !randomization.controller
    || typeof randomization.failureDomain !== "string" || !randomization.failureDomain
    || !Number.isInteger(randomization.assignedAtTick) || randomization.assignedAtTick <= protocolTick
    || !Number.isInteger(randomization.seedRevealedAtTick) || randomization.seedRevealedAtTick < randomization.assignedAtTick
    || randomization.seedRevealedAtTick > parentCommitmentTick) return false;
  const derived = deriveClusterArms(clusters, randomization.seedReveal);
  return derived !== null && clusters.every((cluster) => derived.get(cluster.clusterRoot) === cluster.arm);
}

export function assessReproducibleClusterRandomization(openDebtAxes, dependencyAudit, exercise) {
  const interference = assessClusterInterference(openDebtAxes, dependencyAudit, exercise);
  if (interference.status !== "bounded_cluster_interference_candidate") return interference;

  const commitment = exercise?.clusterRandomizationCommitment;
  if (!validateReproducibleClusterRandomizationSpec()
    || commitment?.algorithm !== "sha256"
    || !Number.isInteger(commitment?.committedAtTick)
    || commitment.committedAtTick > exercise?.clusterInterferenceCommitment?.committedAtTick
    || commitment.digest !== computeClusterRandomizationProtocolDigest(exercise)) {
    return { status: "not_established", failures: ["invalid_cluster_randomization_protocol"] };
  }

  const failures = [];
  for (const { challenge, probe } of probes(exercise)) {
    if (!validReproducibleProbe(probe, commitment.committedAtTick, exercise.clusterInterferenceCommitment.committedAtTick)) {
      failures.push({ signal: `${challenge.signalType}:${challenge.signal}`, probeId: probe.probeId, reason: "cluster_assignment_not_reproducible" });
    }
  }
  return { status: failures.length === 0 ? "bounded_reproducible_cluster_randomization_candidate" : "not_established", failures };
}

export function selectReproducibleRandomizationQualifiedBridge(
  actionOntology, allowedActions, openDebtAxes, bridgeExercises, failoverExercises,
  commonCauseExercises, dependencyAudits, subthresholdExercises, crossClassExercises,
  tripleExercises, dualContextExercises, riskDirectedExercises, signalProvenanceExercises,
  signalTransportExercises, uncertaintyTransportExercises, clusterTransportExercises,
  clusterLineageExercises, portfolioLineageExercises, lineageAttestationExercises,
  crossSignalPerturbationExercises, observedPerturbationExercises, randomizedAssignmentExercises,
  clusterInterferenceExercises, reproducibleRandomizationExercises
) {
  const qualified = allowedActions.filter((action) =>
    assessReproducibleClusterRandomization(openDebtAxes, dependencyAudits?.[action], reproducibleRandomizationExercises?.[action]).status
      === "bounded_reproducible_cluster_randomization_candidate"
  );
  return selectClusterInterferenceQualifiedBridge(
    actionOntology, qualified, openDebtAxes, bridgeExercises, failoverExercises,
    commonCauseExercises, dependencyAudits, subthresholdExercises, crossClassExercises,
    tripleExercises, dualContextExercises, riskDirectedExercises, signalProvenanceExercises,
    signalTransportExercises, uncertaintyTransportExercises, clusterTransportExercises,
    clusterLineageExercises, portfolioLineageExercises, lineageAttestationExercises,
    crossSignalPerturbationExercises, observedPerturbationExercises, randomizedAssignmentExercises,
    clusterInterferenceExercises
  );
}

export class CctReproducibleClusterRandomizationRuntime extends CctClusterInterferenceRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const openDebtAxes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = selectReproducibleRandomizationQualifiedBridge(
      view?.cct?.actionOntology, allowedActions, openDebtAxes, view?.cct?.bridgeExercises,
      view?.cct?.failoverExercises, view?.cct?.commonCauseExercises, view?.cct?.dependencyAudits,
      view?.cct?.subthresholdExercises, view?.cct?.crossClassExercises, view?.cct?.tripleExercises,
      view?.cct?.dualContextExercises, view?.cct?.riskDirectedExercises,
      view?.cct?.signalProvenanceExercises, view?.cct?.signalTransportExercises,
      view?.cct?.uncertaintyTransportExercises, view?.cct?.clusterTransportExercises,
      view?.cct?.clusterLineageExercises, view?.cct?.portfolioLineageExercises,
      view?.cct?.lineageAttestationExercises, view?.cct?.crossSignalPerturbationExercises,
      view?.cct?.observedPerturbationExercises, view?.cct?.randomizedAssignmentExercises,
      view?.cct?.clusterInterferenceExercises, view?.cct?.reproducibleRandomizationExercises
    );
    if (!selected) this.terminal("CCT_CLUSTER_RANDOMIZATION_UNREPRODUCIBLE", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
