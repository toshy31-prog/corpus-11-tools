import { readFileSync } from "node:fs";
import {
  assessDistributionalPretreatmentPlacebos,
  CctDistributionalPretreatmentPlaceboRuntime,
  selectDistributionalPlaceboQualifiedBridge
} from "../sequenced-restoration-v4.4-distributional-pretreatment-placebos/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
const OUTCOMES = ["lagged_event_rate", "preperiod_access_loss", "unrelated_failure_rate"];

function groups() {
  const dependency = SPEC.dependencyThresholds.map((minimum) => ({ id: `dependency_at_least_${minimum}`, dependencyMinimum: minimum }));
  const access = SPEC.accessLossThresholds.map((minimum) => ({ id: `access_loss_at_least_${minimum}`, accessMinimum: minimum }));
  const intersections = SPEC.dependencyThresholds.flatMap((dependencyMinimum) =>
    SPEC.accessLossThresholds.map((accessMinimum) => ({
      id: `compound_${dependencyMinimum}_${accessMinimum}`,
      dependencyMinimum,
      accessMinimum
    }))
  );
  return [...dependency, ...access, ...intersections];
}

export function validateThresholdSensitivitySpec(candidate = SPEC) {
  return candidate?.schema === "cct-distributional-threshold-sensitivity/v1"
    && candidate?.version === "4.5-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-4.4-DISTRIBUTIONAL-PRETREATMENT-PLACEBOS-CANDIDATE-001"
    && candidate?.dependencyThresholds?.length === 3
    && candidate?.accessLossThresholds?.length === 3
    && candidate?.groupCount === 15
    && candidate?.comparisonCount === 4050
    && candidate?.minimumClustersPerArm === 4
    && candidate?.adjustedZCritical === 4.8
    && candidate?.maximumAbsolutePlaceboDifference === 0.05;
}

function probes(exercise) {
  return exercise?.crossSignalPerturbations?.flatMap((challenge) =>
    challenge?.probes?.map((probe) => ({ challenge, probe })) ?? []
  ) ?? [];
}

function belongs(cluster, group) {
  const values = cluster?.pretreatment?.values;
  return (group.dependencyMinimum === undefined || values?.dependency_load >= group.dependencyMinimum)
    && (group.accessMinimum === undefined || values?.access_loss >= group.accessMinimum);
}

function aggregate(clusters, outcome) {
  const counts = clusters.map((cluster) => cluster.distributionalPlaceboCounts.find((item) => item.outcome === outcome));
  return {
    eventCount: counts.reduce((sum, count) => sum + count.eventCount, 0),
    sampleSize: counts.reduce((sum, count) => sum + count.sampleSize, 0)
  };
}

function wilsonInterval({ eventCount, sampleSize }) {
  const p = eventCount / sampleSize;
  const z2 = SPEC.adjustedZCritical ** 2;
  const denominator = 1 + z2 / sampleSize;
  const center = (p + z2 / (2 * sampleSize)) / denominator;
  const half = SPEC.adjustedZCritical * Math.sqrt(p * (1 - p) / sampleSize + z2 / (4 * sampleSize ** 2)) / denominator;
  return [Math.max(0, center - half), Math.min(1, center + half)];
}

export function assessThresholdSensitivity(openDebtAxes, dependencyAudit, exercise) {
  const distributional = assessDistributionalPretreatmentPlacebos(openDebtAxes, dependencyAudit, exercise);
  if (distributional.status !== "bounded_distributional_pretreatment_placebo_candidate") return distributional;
  if (!validateThresholdSensitivitySpec() || groups().length !== SPEC.groupCount) {
    return { status: "not_established", failures: ["invalid_threshold_sensitivity_spec"] };
  }
  const failures = [];
  for (const { challenge, probe } of probes(exercise)) {
    const clusters = probe.clusterAssignment.clusters;
    for (const group of groups()) {
      const members = clusters.filter((cluster) => belongs(cluster, group));
      const baseline = members.filter((cluster) => cluster.arm === "baseline");
      const perturbed = members.filter((cluster) => cluster.arm === "perturbed");
      if (baseline.length < SPEC.minimumClustersPerArm || perturbed.length < SPEC.minimumClustersPerArm) {
        failures.push({ signal: `${challenge.signalType}:${challenge.signal}`, probeId: probe.probeId, group: group.id, reason: "sensitivity_slice_underpowered" });
        continue;
      }
      for (const outcome of OUTCOMES) {
        const left = wilsonInterval(aggregate(baseline, outcome));
        const right = wilsonInterval(aggregate(perturbed, outcome));
        const difference = [right[0] - left[1], right[1] - left[0]];
        if (Math.max(Math.abs(difference[0]), Math.abs(difference[1])) > SPEC.maximumAbsolutePlaceboDifference) {
          failures.push({ signal: `${challenge.signalType}:${challenge.signal}`, probeId: probe.probeId, group: group.id, outcome, reason: "threshold_sensitive_placebo_difference" });
        }
      }
    }
  }
  return { status: failures.length === 0 ? SPEC.successStatus : "not_established", failures };
}

export function selectThresholdRobustBridge(
  actionOntology, allowedActions, openDebtAxes, bridgeExercises, failoverExercises,
  commonCauseExercises, dependencyAudits, subthresholdExercises, crossClassExercises,
  tripleExercises, dualContextExercises, riskDirectedExercises, signalProvenanceExercises,
  signalTransportExercises, uncertaintyTransportExercises, clusterTransportExercises,
  clusterLineageExercises, portfolioLineageExercises, lineageAttestationExercises,
  crossSignalPerturbationExercises, observedPerturbationExercises, randomizedAssignmentExercises,
  clusterInterferenceExercises, reproducibleRandomizationExercises, pretreatmentBalanceExercises,
  pretreatmentPlaceboExercises, distributionalBalanceExercises, distributionalPlaceboExercises,
  thresholdSensitivityExercises
) {
  const qualified = allowedActions.filter((action) =>
    assessThresholdSensitivity(openDebtAxes, dependencyAudits?.[action], thresholdSensitivityExercises?.[action]).status === SPEC.successStatus
  );
  return selectDistributionalPlaceboQualifiedBridge(
    actionOntology, qualified, openDebtAxes, bridgeExercises, failoverExercises, commonCauseExercises,
    dependencyAudits, subthresholdExercises, crossClassExercises, tripleExercises, dualContextExercises,
    riskDirectedExercises, signalProvenanceExercises, signalTransportExercises, uncertaintyTransportExercises,
    clusterTransportExercises, clusterLineageExercises, portfolioLineageExercises, lineageAttestationExercises,
    crossSignalPerturbationExercises, observedPerturbationExercises, randomizedAssignmentExercises,
    clusterInterferenceExercises, reproducibleRandomizationExercises, pretreatmentBalanceExercises,
    pretreatmentPlaceboExercises, distributionalBalanceExercises, distributionalPlaceboExercises
  );
}

export class CctThresholdSensitivityRuntime extends CctDistributionalPretreatmentPlaceboRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const openDebtAxes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = selectThresholdRobustBridge(
      view?.cct?.actionOntology, allowedActions, openDebtAxes, view?.cct?.bridgeExercises,
      view?.cct?.failoverExercises, view?.cct?.commonCauseExercises, view?.cct?.dependencyAudits,
      view?.cct?.subthresholdExercises, view?.cct?.crossClassExercises, view?.cct?.tripleExercises,
      view?.cct?.dualContextExercises, view?.cct?.riskDirectedExercises, view?.cct?.signalProvenanceExercises,
      view?.cct?.signalTransportExercises, view?.cct?.uncertaintyTransportExercises,
      view?.cct?.clusterTransportExercises, view?.cct?.clusterLineageExercises,
      view?.cct?.portfolioLineageExercises, view?.cct?.lineageAttestationExercises,
      view?.cct?.crossSignalPerturbationExercises, view?.cct?.observedPerturbationExercises,
      view?.cct?.randomizedAssignmentExercises, view?.cct?.clusterInterferenceExercises,
      view?.cct?.reproducibleRandomizationExercises, view?.cct?.pretreatmentBalanceExercises,
      view?.cct?.pretreatmentPlaceboExercises, view?.cct?.distributionalBalanceExercises,
      view?.cct?.distributionalPlaceboExercises, view?.cct?.thresholdSensitivityExercises
    );
    if (!selected) this.terminal("CCT_THRESHOLD_SENSITIVITY_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
