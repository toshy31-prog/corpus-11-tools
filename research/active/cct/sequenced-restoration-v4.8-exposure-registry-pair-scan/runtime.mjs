import { readFileSync } from "node:fs";
import { assessBivariateThresholdScan, CctBivariateThresholdScanRuntime } from "../sequenced-restoration-v4.7-bivariate-threshold-scan/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
const OUTCOMES = ["lagged_event_rate", "preperiod_access_loss", "unrelated_failure_rate"];

export function validateExposureRegistrySpec(candidate = SPEC) {
  return candidate?.schema === "cct-exposure-registry-pair-scan/v1" && candidate?.version === "4.8-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-4.7-BIVARIATE-THRESHOLD-SCAN-CANDIDATE-001"
    && JSON.stringify(candidate?.registeredCovariates) === JSON.stringify(["baseline_event_rate", "dependency_load", "access_loss"])
    && candidate?.pairCount === 3 && candidate?.minimumClustersPerArm === 5
    && candidate?.maximumThresholdsPerCovariate === 16 && candidate?.maximumComparisonCount === 207360
    && candidate?.adjustedTCritical === 6.4 && candidate?.maximumAbsolutePlaceboDifference === 0.05;
}

function probes(exercise) { return exercise?.crossSignalPerturbations?.flatMap((challenge) => challenge?.probes?.map((probe) => ({ challenge, probe })) ?? []) ?? []; }
function pairs(values) { return values.flatMap((left, index) => values.slice(index + 1).map((right) => [left, right])); }
function mean(values) { return values.reduce((sum, value) => sum + value, 0) / values.length; }
function variance(values) { const average = mean(values); return values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1); }
function rate(cluster, outcome) { const count = cluster.distributionalPlaceboCounts.find((item) => item.outcome === outcome); return count.eventCount / count.sampleSize; }
function thresholds(clusters, covariate) {
  return [...new Set(clusters.map((cluster) => cluster.pretreatment.values[covariate]))].sort((a, b) => a - b).filter((threshold) => {
    const members = clusters.filter((cluster) => cluster.pretreatment.values[covariate] >= threshold);
    return members.filter((cluster) => cluster.arm === "baseline").length >= SPEC.minimumClustersPerArm
      && members.filter((cluster) => cluster.arm === "perturbed").length >= SPEC.minimumClustersPerArm;
  });
}
function interval(left, right) {
  const delta = mean(right) - mean(left);
  const half = SPEC.adjustedTCritical * Math.sqrt(variance(left) / left.length + variance(right) / right.length);
  return [delta - half, delta + half];
}

export function assessExposureRegistryPairScan(openDebtAxes, dependencyAudit, exercise) {
  const prior = assessBivariateThresholdScan(openDebtAxes, dependencyAudit, exercise);
  if (prior.status !== "bounded_bivariate_threshold_scan_candidate") return prior;
  const observed = Object.keys(exercise?.crossSignalPerturbations?.[0]?.probes?.[0]?.clusterAssignment?.clusters?.[0]?.pretreatment?.values ?? {}).sort();
  const declared = [...(exercise?.exposureRegistry ?? [])].sort();
  if (!validateExposureRegistrySpec() || JSON.stringify(observed) !== JSON.stringify([...SPEC.registeredCovariates].sort())
    || JSON.stringify(declared) !== JSON.stringify([...SPEC.registeredCovariates].sort())) {
    return { status: "not_established", comparisons: 0, failures: ["exposure_registry_incomplete"] };
  }
  const failures = [];
  let comparisons = 0;
  for (const { challenge, probe } of probes(exercise)) {
    const clusters = probe.clusterAssignment.clusters;
    for (const [leftName, rightName] of pairs(SPEC.registeredCovariates)) {
      const leftThresholds = thresholds(clusters, leftName);
      const rightThresholds = thresholds(clusters, rightName);
      if (leftThresholds.length > SPEC.maximumThresholdsPerCovariate || rightThresholds.length > SPEC.maximumThresholdsPerCovariate) {
        failures.push({ signal: `${challenge.signalType}:${challenge.signal}`, probeId: probe.probeId, pair: `${leftName}+${rightName}`, reason: "registry_pair_search_budget_exceeded" });
        continue;
      }
      for (const leftMinimum of leftThresholds) for (const rightMinimum of rightThresholds) {
        const members = clusters.filter((cluster) => cluster.pretreatment.values[leftName] >= leftMinimum && cluster.pretreatment.values[rightName] >= rightMinimum);
        const baseline = members.filter((cluster) => cluster.arm === "baseline");
        const perturbed = members.filter((cluster) => cluster.arm === "perturbed");
        if (baseline.length < SPEC.minimumClustersPerArm || perturbed.length < SPEC.minimumClustersPerArm) continue;
        for (const outcome of OUTCOMES) {
          comparisons += 1;
          const bounds = interval(baseline.map((cluster) => rate(cluster, outcome)), perturbed.map((cluster) => rate(cluster, outcome)));
          if (!bounds.every(Number.isFinite) || Math.max(Math.abs(bounds[0]), Math.abs(bounds[1])) > SPEC.maximumAbsolutePlaceboDifference) {
            failures.push({ signal: `${challenge.signalType}:${challenge.signal}`, probeId: probe.probeId, pair: `${leftName}+${rightName}`, leftMinimum, rightMinimum, outcome, reason: "registered_pair_placebo_difference" });
          }
        }
      }
    }
  }
  if (comparisons > SPEC.maximumComparisonCount) failures.push({ reason: "comparison_budget_exceeded", comparisons });
  return { status: failures.length === 0 ? SPEC.successStatus : "not_established", comparisons, failures };
}

export class CctExposureRegistryPairScanRuntime extends CctBivariateThresholdScanRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const axes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = allowedActions.find((action) => assessExposureRegistryPairScan(axes, view?.cct?.dependencyAudits?.[action], view?.cct?.exposureRegistryPairScanExercises?.[action]).status === SPEC.successStatus);
    if (!selected) this.terminal("CCT_EXPOSURE_REGISTRY_PAIR_SCAN_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
