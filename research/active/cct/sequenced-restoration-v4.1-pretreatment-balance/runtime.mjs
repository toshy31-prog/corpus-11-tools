import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  assessReproducibleClusterRandomization,
  CctReproducibleClusterRandomizationRuntime,
  selectReproducibleRandomizationQualifiedBridge
} from "../sequenced-restoration-v4.0-reproducible-cluster-randomization/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function validatePretreatmentBalanceSpec(candidate = SPEC) {
  return candidate?.schema === "cct-pretreatment-balance/v1"
    && candidate?.version === "4.1-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-4.0-REPRODUCIBLE-CLUSTER-RANDOMIZATION-CANDIDATE-001"
    && JSON.stringify(candidate?.requiredCovariates) === JSON.stringify(["baseline_event_rate", "dependency_load", "access_loss"])
    && candidate?.maximumWithinStratumDifference === 0.1
    && candidate?.maximumAbsoluteStandardizedMeanDifference === 0.1;
}

function probes(exercise) {
  return exercise?.crossSignalPerturbations?.flatMap((challenge) =>
    challenge?.probes?.map((probe) => ({ challenge, probe })) ?? []
  ) ?? [];
}

function balanceProtocolInput(exercise) {
  return {
    schema: "cct-pretreatment-balance-protocol/v1",
    requiredCovariates: SPEC.requiredCovariates,
    maximumWithinStratumDifference: SPEC.maximumWithinStratumDifference,
    maximumAbsoluteStandardizedMeanDifference: SPEC.maximumAbsoluteStandardizedMeanDifference,
    probes: probes(exercise).map(({ challenge, probe }) => ({
      target: `${challenge?.signalType}:${challenge?.signal}`,
      probeId: probe?.probeId,
      clusters: probe?.clusterAssignment?.clusters?.map((cluster) => ({
        clusterRoot: cluster?.clusterRoot,
        stratum: cluster?.stratum,
        pretreatment: cluster?.pretreatment
      }))
    }))
  };
}

export function computePretreatmentBalanceProtocolDigest(exercise) {
  return createHash("sha256").update(JSON.stringify(balanceProtocolInput(exercise))).digest("hex");
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function variance(values) {
  const average = mean(values);
  return values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1);
}

function standardizedMeanDifference(left, right) {
  const pooledDeviation = Math.sqrt((variance(left) + variance(right)) / 2);
  const difference = Math.abs(mean(left) - mean(right));
  return pooledDeviation === 0 ? (difference === 0 ? 0 : Infinity) : difference / pooledDeviation;
}

function validPretreatmentRecord(record, commitmentTick) {
  return record?.schema === "cluster-pretreatment-covariates/v1"
    && typeof record.sourceRoot === "string" && record.sourceRoot
    && typeof record.controller === "string" && record.controller
    && typeof record.failureDomain === "string" && record.failureDomain
    && Number.isInteger(record.measuredAtTick) && record.measuredAtTick < commitmentTick
    && record.values && Object.keys(record.values).length === SPEC.requiredCovariates.length
    && SPEC.requiredCovariates.every((name) => typeof record.values[name] === "number" && record.values[name] >= 0 && record.values[name] <= 1);
}

function probeBalanceFailures(probe, commitmentTick) {
  const clusters = probe.clusterAssignment.clusters;
  if (clusters.some((cluster) => !validPretreatmentRecord(cluster.pretreatment, commitmentTick))) return ["pretreatment_measurement_invalid"];
  const roots = clusters.map((cluster) => cluster.pretreatment.sourceRoot);
  if (new Set(roots).size !== roots.length) return ["pretreatment_source_reused"];

  const failures = [];
  for (const stratum of new Set(clusters.map((cluster) => cluster.stratum))) {
    const pair = clusters.filter((cluster) => cluster.stratum === stratum);
    for (const name of SPEC.requiredCovariates) {
      if (Math.abs(pair[0].pretreatment.values[name] - pair[1].pretreatment.values[name]) > SPEC.maximumWithinStratumDifference) {
        failures.push(`within_stratum_imbalance:${stratum}:${name}`);
      }
    }
  }
  const baseline = clusters.filter((cluster) => cluster.arm === "baseline");
  const perturbed = clusters.filter((cluster) => cluster.arm === "perturbed");
  for (const name of SPEC.requiredCovariates) {
    const smd = standardizedMeanDifference(
      baseline.map((cluster) => cluster.pretreatment.values[name]),
      perturbed.map((cluster) => cluster.pretreatment.values[name])
    );
    if (smd > SPEC.maximumAbsoluteStandardizedMeanDifference) failures.push(`arm_imbalance:${name}`);
  }
  return failures;
}

export function assessPretreatmentBalance(openDebtAxes, dependencyAudit, exercise) {
  const randomized = assessReproducibleClusterRandomization(openDebtAxes, dependencyAudit, exercise);
  if (randomized.status !== "bounded_reproducible_cluster_randomization_candidate") return randomized;

  const commitment = exercise?.pretreatmentBalanceCommitment;
  if (!validatePretreatmentBalanceSpec()
    || commitment?.algorithm !== "sha256"
    || !Number.isInteger(commitment?.committedAtTick)
    || commitment.committedAtTick > exercise?.clusterRandomizationCommitment?.committedAtTick
    || commitment.digest !== computePretreatmentBalanceProtocolDigest(exercise)) {
    return { status: "not_established", failures: ["invalid_pretreatment_balance_protocol"] };
  }

  const failures = [];
  for (const { challenge, probe } of probes(exercise)) {
    const reasons = probeBalanceFailures(probe, commitment.committedAtTick);
    if (reasons.length > 0) failures.push({ signal: `${challenge.signalType}:${challenge.signal}`, probeId: probe.probeId, reason: "pretreatment_imbalance", details: reasons });
  }
  return { status: failures.length === 0 ? "bounded_pretreatment_balance_candidate" : "not_established", failures };
}

export function selectPretreatmentBalancedBridge(
  actionOntology, allowedActions, openDebtAxes, bridgeExercises, failoverExercises,
  commonCauseExercises, dependencyAudits, subthresholdExercises, crossClassExercises,
  tripleExercises, dualContextExercises, riskDirectedExercises, signalProvenanceExercises,
  signalTransportExercises, uncertaintyTransportExercises, clusterTransportExercises,
  clusterLineageExercises, portfolioLineageExercises, lineageAttestationExercises,
  crossSignalPerturbationExercises, observedPerturbationExercises, randomizedAssignmentExercises,
  clusterInterferenceExercises, reproducibleRandomizationExercises, pretreatmentBalanceExercises
) {
  const qualified = allowedActions.filter((action) =>
    assessPretreatmentBalance(openDebtAxes, dependencyAudits?.[action], pretreatmentBalanceExercises?.[action]).status
      === "bounded_pretreatment_balance_candidate"
  );
  return selectReproducibleRandomizationQualifiedBridge(
    actionOntology, qualified, openDebtAxes, bridgeExercises, failoverExercises,
    commonCauseExercises, dependencyAudits, subthresholdExercises, crossClassExercises,
    tripleExercises, dualContextExercises, riskDirectedExercises, signalProvenanceExercises,
    signalTransportExercises, uncertaintyTransportExercises, clusterTransportExercises,
    clusterLineageExercises, portfolioLineageExercises, lineageAttestationExercises,
    crossSignalPerturbationExercises, observedPerturbationExercises, randomizedAssignmentExercises,
    clusterInterferenceExercises, reproducibleRandomizationExercises
  );
}

export class CctPretreatmentBalanceRuntime extends CctReproducibleClusterRandomizationRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const openDebtAxes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = selectPretreatmentBalancedBridge(
      view?.cct?.actionOntology, allowedActions, openDebtAxes, view?.cct?.bridgeExercises,
      view?.cct?.failoverExercises, view?.cct?.commonCauseExercises, view?.cct?.dependencyAudits,
      view?.cct?.subthresholdExercises, view?.cct?.crossClassExercises, view?.cct?.tripleExercises,
      view?.cct?.dualContextExercises, view?.cct?.riskDirectedExercises,
      view?.cct?.signalProvenanceExercises, view?.cct?.signalTransportExercises,
      view?.cct?.uncertaintyTransportExercises, view?.cct?.clusterTransportExercises,
      view?.cct?.clusterLineageExercises, view?.cct?.portfolioLineageExercises,
      view?.cct?.lineageAttestationExercises, view?.cct?.crossSignalPerturbationExercises,
      view?.cct?.observedPerturbationExercises, view?.cct?.randomizedAssignmentExercises,
      view?.cct?.clusterInterferenceExercises, view?.cct?.reproducibleRandomizationExercises,
      view?.cct?.pretreatmentBalanceExercises
    );
    if (!selected) this.terminal("CCT_PRETREATMENT_BALANCE_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
