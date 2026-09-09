import { readFileSync } from "node:fs";
import {
  assessPretreatmentPlacebos,
  CctPretreatmentPlaceboRuntime,
  selectPlaceboQualifiedBridge
} from "../sequenced-restoration-v4.2-pretreatment-placebos/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
const COVARIATES = ["baseline_event_rate", "dependency_load", "access_loss"];

export function validateDistributionalPretreatmentBalanceSpec(candidate = SPEC) {
  return candidate?.schema === "cct-distributional-pretreatment-balance/v1"
    && candidate?.version === "4.3-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-4.2-PRETREATMENT-PLACEBOS-CANDIDATE-001"
    && Array.isArray(candidate?.groups) && candidate.groups.length === 3
    && candidate?.minimumClustersPerGroup === 8
    && candidate?.minimumClustersPerArm === 4
    && candidate?.maximumAbsoluteStandardizedMeanDifference === 0.1;
}

function probes(exercise) {
  return exercise?.crossSignalPerturbations?.flatMap((challenge) =>
    challenge?.probes?.map((probe) => ({ challenge, probe })) ?? []
  ) ?? [];
}

function matchesCondition(cluster, condition) {
  const value = cluster?.pretreatment?.values?.[condition?.covariate];
  return typeof value === "number" && value >= condition.minimum;
}

function belongs(cluster, group) {
  if (Array.isArray(group.all)) return group.all.every((condition) => matchesCondition(cluster, condition));
  return matchesCondition(cluster, group);
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function variance(values) {
  if (values.length < 2) return NaN;
  const average = mean(values);
  return values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1);
}

function standardizedMeanDifference(left, right) {
  const pooledDeviation = Math.sqrt((variance(left) + variance(right)) / 2);
  const difference = Math.abs(mean(left) - mean(right));
  return pooledDeviation === 0 ? (difference === 0 ? 0 : Infinity) : difference / pooledDeviation;
}

function distributionalFailures(probe) {
  const clusters = probe?.clusterAssignment?.clusters ?? [];
  const failures = [];
  for (const group of SPEC.groups) {
    const members = clusters.filter((cluster) => belongs(cluster, group));
    const baseline = members.filter((cluster) => cluster.arm === "baseline");
    const perturbed = members.filter((cluster) => cluster.arm === "perturbed");
    if (members.length < SPEC.minimumClustersPerGroup
      || baseline.length < SPEC.minimumClustersPerArm
      || perturbed.length < SPEC.minimumClustersPerArm) {
      failures.push(`exposure_group_underpowered:${group.id}`);
      continue;
    }
    for (const covariate of COVARIATES) {
      const smd = standardizedMeanDifference(
        baseline.map((cluster) => cluster.pretreatment.values[covariate]),
        perturbed.map((cluster) => cluster.pretreatment.values[covariate])
      );
      if (!Number.isFinite(smd) || smd > SPEC.maximumAbsoluteStandardizedMeanDifference) {
        failures.push(`exposure_group_imbalance:${group.id}:${covariate}`);
      }
    }
  }
  return failures;
}

export function assessDistributionalPretreatmentBalance(openDebtAxes, dependencyAudit, exercise) {
  const placebo = assessPretreatmentPlacebos(openDebtAxes, dependencyAudit, exercise);
  if (placebo.status !== "bounded_pretreatment_placebo_candidate") return placebo;
  if (!validateDistributionalPretreatmentBalanceSpec()) {
    return { status: "not_established", failures: ["invalid_distributional_pretreatment_balance_spec"] };
  }
  const failures = [];
  for (const { challenge, probe } of probes(exercise)) {
    const details = distributionalFailures(probe);
    if (details.length > 0) failures.push({
      signal: `${challenge.signalType}:${challenge.signal}`,
      probeId: probe.probeId,
      reason: "distributional_pretreatment_imbalance",
      details
    });
  }
  return { status: failures.length === 0 ? SPEC.successStatus : "not_established", failures };
}

export function selectDistributionallyBalancedBridge(
  actionOntology, allowedActions, openDebtAxes, bridgeExercises, failoverExercises,
  commonCauseExercises, dependencyAudits, subthresholdExercises, crossClassExercises,
  tripleExercises, dualContextExercises, riskDirectedExercises, signalProvenanceExercises,
  signalTransportExercises, uncertaintyTransportExercises, clusterTransportExercises,
  clusterLineageExercises, portfolioLineageExercises, lineageAttestationExercises,
  crossSignalPerturbationExercises, observedPerturbationExercises, randomizedAssignmentExercises,
  clusterInterferenceExercises, reproducibleRandomizationExercises, pretreatmentBalanceExercises,
  pretreatmentPlaceboExercises, distributionalBalanceExercises
) {
  const qualified = allowedActions.filter((action) =>
    assessDistributionalPretreatmentBalance(openDebtAxes, dependencyAudits?.[action], distributionalBalanceExercises?.[action]).status
      === SPEC.successStatus
  );
  return selectPlaceboQualifiedBridge(
    actionOntology, qualified, openDebtAxes, bridgeExercises, failoverExercises,
    commonCauseExercises, dependencyAudits, subthresholdExercises, crossClassExercises,
    tripleExercises, dualContextExercises, riskDirectedExercises, signalProvenanceExercises,
    signalTransportExercises, uncertaintyTransportExercises, clusterTransportExercises,
    clusterLineageExercises, portfolioLineageExercises, lineageAttestationExercises,
    crossSignalPerturbationExercises, observedPerturbationExercises, randomizedAssignmentExercises,
    clusterInterferenceExercises, reproducibleRandomizationExercises, pretreatmentBalanceExercises,
    pretreatmentPlaceboExercises
  );
}

export class CctDistributionalPretreatmentBalanceRuntime extends CctPretreatmentPlaceboRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const openDebtAxes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = selectDistributionallyBalancedBridge(
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
      view?.cct?.pretreatmentBalanceExercises, view?.cct?.pretreatmentPlaceboExercises,
      view?.cct?.distributionalBalanceExercises
    );
    if (!selected) this.terminal("CCT_DISTRIBUTIONAL_PRETREATMENT_BALANCE_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
