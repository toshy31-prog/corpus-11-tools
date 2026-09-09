import { readFileSync } from "node:fs";
import { assessObservedThresholdScan, CctObservedThresholdScanRuntime } from "../sequenced-restoration-v4.6-observed-threshold-scan/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
const OUTCOMES = ["lagged_event_rate", "preperiod_access_loss", "unrelated_failure_rate"];

export function validateBivariateThresholdScanSpec(candidate = SPEC) {
  return candidate?.schema === "cct-bivariate-threshold-scan/v1" && candidate?.version === "4.7-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-4.6-OBSERVED-THRESHOLD-SCAN-CANDIDATE-001"
    && candidate?.minimumClustersPerArm === 5 && candidate?.maximumThresholdsPerCovariate === 16
    && candidate?.maximumComparisonCount === 69120 && candidate?.adjustedTCritical === 6
    && candidate?.maximumAbsolutePlaceboDifference === 0.05;
}

function probes(exercise) { return exercise?.crossSignalPerturbations?.flatMap((challenge) => challenge?.probes?.map((probe) => ({ challenge, probe })) ?? []) ?? []; }
function mean(values) { return values.reduce((sum, value) => sum + value, 0) / values.length; }
function variance(values) { const m = mean(values); return values.reduce((sum, value) => sum + (value - m) ** 2, 0) / (values.length - 1); }
function rate(cluster, outcome) { const count = cluster.distributionalPlaceboCounts.find((item) => item.outcome === outcome); return count.eventCount / count.sampleSize; }

function thresholds(clusters, covariate) {
  return [...new Set(clusters.map((cluster) => cluster.pretreatment.values[covariate]))].sort((a, b) => a - b).filter((threshold) => {
    const members = clusters.filter((cluster) => cluster.pretreatment.values[covariate] >= threshold);
    return members.filter((cluster) => cluster.arm === "baseline").length >= SPEC.minimumClustersPerArm
      && members.filter((cluster) => cluster.arm === "perturbed").length >= SPEC.minimumClustersPerArm;
  });
}

function differenceInterval(left, right) {
  const delta = mean(right) - mean(left);
  const standardError = Math.sqrt(variance(left) / left.length + variance(right) / right.length);
  const half = SPEC.adjustedTCritical * standardError;
  return [delta - half, delta + half];
}

export function assessBivariateThresholdScan(openDebtAxes, dependencyAudit, exercise) {
  const univariate = assessObservedThresholdScan(openDebtAxes, dependencyAudit, exercise);
  if (univariate.status !== "bounded_observed_threshold_scan_candidate") return univariate;
  if (!validateBivariateThresholdScanSpec()) return { status: "not_established", failures: ["invalid_bivariate_threshold_scan_spec"] };
  const failures = [];
  let comparisons = 0;
  for (const { challenge, probe } of probes(exercise)) {
    const clusters = probe.clusterAssignment.clusters;
    const dependency = thresholds(clusters, "dependency_load");
    const access = thresholds(clusters, "access_loss");
    if (dependency.length > SPEC.maximumThresholdsPerCovariate || access.length > SPEC.maximumThresholdsPerCovariate) {
      failures.push({ signal: `${challenge.signalType}:${challenge.signal}`, probeId: probe.probeId, reason: "bivariate_search_budget_exceeded" });
      continue;
    }
    for (const dependencyMinimum of dependency) for (const accessMinimum of access) {
      const members = clusters.filter((cluster) => cluster.pretreatment.values.dependency_load >= dependencyMinimum && cluster.pretreatment.values.access_loss >= accessMinimum);
      const baseline = members.filter((cluster) => cluster.arm === "baseline");
      const perturbed = members.filter((cluster) => cluster.arm === "perturbed");
      if (baseline.length < SPEC.minimumClustersPerArm || perturbed.length < SPEC.minimumClustersPerArm) continue;
      for (const outcome of OUTCOMES) {
        comparisons += 1;
        const interval = differenceInterval(baseline.map((cluster) => rate(cluster, outcome)), perturbed.map((cluster) => rate(cluster, outcome)));
        if (!interval.every(Number.isFinite) || Math.max(Math.abs(interval[0]), Math.abs(interval[1])) > SPEC.maximumAbsolutePlaceboDifference) {
          failures.push({ signal: `${challenge.signalType}:${challenge.signal}`, probeId: probe.probeId, dependencyMinimum, accessMinimum, outcome, reason: "bivariate_placebo_difference" });
        }
      }
    }
  }
  if (comparisons > SPEC.maximumComparisonCount) failures.push({ reason: "comparison_budget_exceeded", comparisons });
  return { status: failures.length === 0 ? SPEC.successStatus : "not_established", comparisons, failures };
}

export class CctBivariateThresholdScanRuntime extends CctObservedThresholdScanRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const axes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = allowedActions.find((action) => assessBivariateThresholdScan(axes, view?.cct?.dependencyAudits?.[action], view?.cct?.bivariateThresholdScanExercises?.[action]).status === SPEC.successStatus);
    if (!selected) this.terminal("CCT_BIVARIATE_THRESHOLD_SCAN_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
