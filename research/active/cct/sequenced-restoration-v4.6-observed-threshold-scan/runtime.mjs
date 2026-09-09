import { readFileSync } from "node:fs";
import { assessThresholdSensitivity, CctThresholdSensitivityRuntime } from "../sequenced-restoration-v4.5-threshold-sensitivity/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function validateObservedThresholdScanSpec(candidate = SPEC) {
  return candidate?.schema === "cct-observed-threshold-scan/v1"
    && candidate?.version === "4.6-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-4.5-THRESHOLD-SENSITIVITY-CANDIDATE-001"
    && JSON.stringify(candidate?.scanCovariates) === JSON.stringify(["dependency_load", "access_loss"])
    && candidate?.minimumClustersPerArm === 10
    && candidate?.maximumGroupsPerCovariate === 21
    && candidate?.maximumComparisonCount === 11340
    && candidate?.adjustedZCritical === 5.3
    && candidate?.maximumAbsolutePlaceboDifference === 0.05;
}

function probes(exercise) {
  return exercise?.crossSignalPerturbations?.flatMap((challenge) =>
    challenge?.probes?.map((probe) => ({ challenge, probe })) ?? []
  ) ?? [];
}

function eligibleThresholds(clusters, covariate) {
  const values = [...new Set(clusters.map((cluster) => cluster?.pretreatment?.values?.[covariate]))]
    .filter((value) => typeof value === "number").sort((a, b) => a - b);
  return values.filter((threshold) => {
    const members = clusters.filter((cluster) => cluster.pretreatment.values[covariate] >= threshold);
    return members.filter((cluster) => cluster.arm === "baseline").length >= SPEC.minimumClustersPerArm
      && members.filter((cluster) => cluster.arm === "perturbed").length >= SPEC.minimumClustersPerArm;
  });
}

function aggregate(clusters, outcome) {
  const counts = clusters.map((cluster) => cluster.distributionalPlaceboCounts.find((item) => item.outcome === outcome));
  return { eventCount: counts.reduce((sum, item) => sum + item.eventCount, 0), sampleSize: counts.reduce((sum, item) => sum + item.sampleSize, 0) };
}

function wilson({ eventCount, sampleSize }) {
  const p = eventCount / sampleSize;
  const z2 = SPEC.adjustedZCritical ** 2;
  const denominator = 1 + z2 / sampleSize;
  const center = (p + z2 / (2 * sampleSize)) / denominator;
  const half = SPEC.adjustedZCritical * Math.sqrt(p * (1 - p) / sampleSize + z2 / (4 * sampleSize ** 2)) / denominator;
  return [Math.max(0, center - half), Math.min(1, center + half)];
}

export function assessObservedThresholdScan(openDebtAxes, dependencyAudit, exercise) {
  const grid = assessThresholdSensitivity(openDebtAxes, dependencyAudit, exercise);
  if (grid.status !== "bounded_threshold_sensitivity_candidate") return grid;
  if (!validateObservedThresholdScanSpec()) return { status: "not_established", failures: ["invalid_observed_threshold_scan_spec"] };
  const failures = [];
  let comparisons = 0;
  for (const { challenge, probe } of probes(exercise)) {
    const clusters = probe.clusterAssignment.clusters;
    for (const covariate of SPEC.scanCovariates) {
      const thresholds = eligibleThresholds(clusters, covariate);
      if (thresholds.length > SPEC.maximumGroupsPerCovariate) {
        failures.push({ signal: `${challenge.signalType}:${challenge.signal}`, probeId: probe.probeId, covariate, reason: "threshold_search_budget_exceeded" });
        continue;
      }
      for (const threshold of thresholds) {
        const members = clusters.filter((cluster) => cluster.pretreatment.values[covariate] >= threshold);
        const baseline = members.filter((cluster) => cluster.arm === "baseline");
        const perturbed = members.filter((cluster) => cluster.arm === "perturbed");
        for (const outcome of SPEC.requiredPlacebos) {
          comparisons += 1;
          const left = wilson(aggregate(baseline, outcome));
          const right = wilson(aggregate(perturbed, outcome));
          const interval = [right[0] - left[1], right[1] - left[0]];
          if (Math.max(Math.abs(interval[0]), Math.abs(interval[1])) > SPEC.maximumAbsolutePlaceboDifference) {
            failures.push({ signal: `${challenge.signalType}:${challenge.signal}`, probeId: probe.probeId, covariate, threshold, outcome, reason: "observed_threshold_placebo_difference" });
          }
        }
      }
    }
  }
  if (comparisons > SPEC.maximumComparisonCount) failures.push({ reason: "comparison_budget_exceeded", comparisons });
  return { status: failures.length === 0 ? SPEC.successStatus : "not_established", comparisons, failures };
}

export class CctObservedThresholdScanRuntime extends CctThresholdSensitivityRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const openDebtAxes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = allowedActions.find((action) =>
      assessObservedThresholdScan(openDebtAxes, view?.cct?.dependencyAudits?.[action], view?.cct?.observedThresholdScanExercises?.[action]).status === SPEC.successStatus
    );
    if (!selected) this.terminal("CCT_OBSERVED_THRESHOLD_SCAN_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
