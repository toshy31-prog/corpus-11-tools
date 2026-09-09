import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  assessDistributionalPretreatmentBalance,
  CctDistributionalPretreatmentBalanceRuntime,
  selectDistributionallyBalancedBridge
} from "../sequenced-restoration-v4.3-distributional-pretreatment-balance/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function validateDistributionalPretreatmentPlaceboSpec(candidate = SPEC) {
  return candidate?.schema === "cct-distributional-pretreatment-placebos/v1"
    && candidate?.version === "4.4-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-4.3-DISTRIBUTIONAL-PRETREATMENT-BALANCE-CANDIDATE-001"
    && JSON.stringify(candidate?.requiredPlacebos) === JSON.stringify(["lagged_event_rate", "preperiod_access_loss", "unrelated_failure_rate"])
    && candidate?.groups?.length === 3
    && candidate?.comparisonCount === 810
    && candidate?.adjustedZCritical === 4.4
    && candidate?.maximumAbsolutePlaceboDifference === 0.05;
}

function probes(exercise) {
  return exercise?.crossSignalPerturbations?.flatMap((challenge) =>
    challenge?.probes?.map((probe) => ({ challenge, probe })) ?? []
  ) ?? [];
}

function protocolInput(exercise) {
  return {
    schema: "cct-distributional-pretreatment-placebo-protocol/v1",
    requiredPlacebos: SPEC.requiredPlacebos,
    groups: SPEC.groups,
    comparisonCount: SPEC.comparisonCount,
    adjustedZCritical: SPEC.adjustedZCritical,
    maximumAbsolutePlaceboDifference: SPEC.maximumAbsolutePlaceboDifference,
    probes: probes(exercise).map(({ challenge, probe }) => ({
      target: `${challenge?.signalType}:${challenge?.signal}`,
      probeId: probe?.probeId,
      clusters: probe?.clusterAssignment?.clusters?.map((cluster) => ({
        clusterRoot: cluster?.clusterRoot,
        arm: cluster?.arm,
        pretreatmentValues: cluster?.pretreatment?.values,
        placeboCounts: cluster?.distributionalPlaceboCounts
      }))
    }))
  };
}

export function computeDistributionalPretreatmentPlaceboDigest(exercise) {
  return createHash("sha256").update(JSON.stringify(protocolInput(exercise))).digest("hex");
}

function matches(cluster, condition) {
  const value = cluster?.pretreatment?.values?.[condition?.covariate];
  return typeof value === "number" && value >= condition.minimum;
}

function belongs(cluster, group) {
  return Array.isArray(group.all) ? group.all.every((condition) => matches(cluster, condition)) : matches(cluster, group);
}

function validCount(count, commitmentTick, assignmentTick) {
  return count?.schema === "cluster-pretreatment-placebo-count/v1"
    && typeof count.outcome === "string"
    && Number.isInteger(count.sampleSize) && count.sampleSize > 0
    && Number.isInteger(count.eventCount) && count.eventCount >= 0 && count.eventCount <= count.sampleSize
    && typeof count.sourceRoot === "string" && count.sourceRoot
    && typeof count.controller === "string" && count.controller
    && typeof count.failureDomain === "string" && count.failureDomain
    && count.blindToFutureAssignment === true
    && Number.isInteger(count.measuredAtTick) && count.measuredAtTick > commitmentTick && count.measuredAtTick < assignmentTick;
}

function wilsonInterval(eventCount, sampleSize) {
  const p = eventCount / sampleSize;
  const z2 = SPEC.adjustedZCritical ** 2;
  const denominator = 1 + z2 / sampleSize;
  const center = (p + z2 / (2 * sampleSize)) / denominator;
  const half = SPEC.adjustedZCritical * Math.sqrt(p * (1 - p) / sampleSize + z2 / (4 * sampleSize ** 2)) / denominator;
  return [Math.max(0, center - half), Math.min(1, center + half)];
}

function aggregate(clusters, outcome) {
  const counts = clusters.map((cluster) => cluster.distributionalPlaceboCounts.find((item) => item.outcome === outcome));
  return {
    eventCount: counts.reduce((sum, count) => sum + count.eventCount, 0),
    sampleSize: counts.reduce((sum, count) => sum + count.sampleSize, 0)
  };
}

export function assessDistributionalPretreatmentPlacebos(openDebtAxes, dependencyAudit, exercise) {
  const balance = assessDistributionalPretreatmentBalance(openDebtAxes, dependencyAudit, exercise);
  if (balance.status !== "bounded_distributional_pretreatment_balance_candidate") return balance;
  const commitment = exercise?.distributionalPretreatmentPlaceboCommitment;
  if (!validateDistributionalPretreatmentPlaceboSpec()
    || commitment?.algorithm !== "sha256"
    || !Number.isInteger(commitment?.committedAtTick)
    || commitment.committedAtTick > exercise?.pretreatmentPlaceboCommitment?.committedAtTick
    || commitment.digest !== computeDistributionalPretreatmentPlaceboDigest(exercise)) {
    return { status: "not_established", failures: ["invalid_distributional_pretreatment_placebo_protocol"] };
  }

  const failures = [];
  const roots = [];
  for (const { challenge, probe } of probes(exercise)) {
    const assignmentTick = probe?.clusterRandomization?.assignedAtTick;
    const clusters = probe?.clusterAssignment?.clusters ?? [];
    let invalid = false;
    for (const cluster of clusters) {
      const counts = cluster?.distributionalPlaceboCounts;
      if (!Array.isArray(counts) || counts.length !== SPEC.requiredPlacebos.length
        || JSON.stringify(counts.map((item) => item?.outcome).sort()) !== JSON.stringify([...SPEC.requiredPlacebos].sort())
        || counts.some((count) => !validCount(count, commitment.committedAtTick, assignmentTick))) {
        failures.push({ signal: `${challenge.signalType}:${challenge.signal}`, probeId: probe.probeId, reason: "cluster_placebo_protocol_invalid" });
        invalid = true;
        break;
      }
      roots.push(...counts.map((count) => count.sourceRoot));
    }
    if (invalid) continue;
    for (const group of SPEC.groups) {
      const members = clusters.filter((cluster) => belongs(cluster, group));
      const baseline = members.filter((cluster) => cluster.arm === "baseline");
      const perturbed = members.filter((cluster) => cluster.arm === "perturbed");
      for (const outcome of SPEC.requiredPlacebos) {
        const left = aggregate(baseline, outcome);
        const right = aggregate(perturbed, outcome);
        const leftInterval = wilsonInterval(left.eventCount, left.sampleSize);
        const rightInterval = wilsonInterval(right.eventCount, right.sampleSize);
        const difference = [rightInterval[0] - leftInterval[1], rightInterval[1] - leftInterval[0]];
        if (Math.max(Math.abs(difference[0]), Math.abs(difference[1])) > SPEC.maximumAbsolutePlaceboDifference) {
          failures.push({ signal: `${challenge.signalType}:${challenge.signal}`, probeId: probe.probeId, group: group.id, outcome, reason: "distributional_placebo_difference_detected" });
        }
      }
    }
  }
  if (new Set(roots).size !== roots.length) failures.push({ reason: "cluster_placebo_source_reused" });
  return { status: failures.length === 0 ? SPEC.successStatus : "not_established", failures };
}

export function selectDistributionalPlaceboQualifiedBridge(
  actionOntology, allowedActions, openDebtAxes, bridgeExercises, failoverExercises,
  commonCauseExercises, dependencyAudits, subthresholdExercises, crossClassExercises,
  tripleExercises, dualContextExercises, riskDirectedExercises, signalProvenanceExercises,
  signalTransportExercises, uncertaintyTransportExercises, clusterTransportExercises,
  clusterLineageExercises, portfolioLineageExercises, lineageAttestationExercises,
  crossSignalPerturbationExercises, observedPerturbationExercises, randomizedAssignmentExercises,
  clusterInterferenceExercises, reproducibleRandomizationExercises, pretreatmentBalanceExercises,
  pretreatmentPlaceboExercises, distributionalBalanceExercises, distributionalPlaceboExercises
) {
  const qualified = allowedActions.filter((action) =>
    assessDistributionalPretreatmentPlacebos(openDebtAxes, dependencyAudits?.[action], distributionalPlaceboExercises?.[action]).status === SPEC.successStatus
  );
  return selectDistributionallyBalancedBridge(
    actionOntology, qualified, openDebtAxes, bridgeExercises, failoverExercises,
    commonCauseExercises, dependencyAudits, subthresholdExercises, crossClassExercises,
    tripleExercises, dualContextExercises, riskDirectedExercises, signalProvenanceExercises,
    signalTransportExercises, uncertaintyTransportExercises, clusterTransportExercises,
    clusterLineageExercises, portfolioLineageExercises, lineageAttestationExercises,
    crossSignalPerturbationExercises, observedPerturbationExercises, randomizedAssignmentExercises,
    clusterInterferenceExercises, reproducibleRandomizationExercises, pretreatmentBalanceExercises,
    pretreatmentPlaceboExercises, distributionalBalanceExercises
  );
}

export class CctDistributionalPretreatmentPlaceboRuntime extends CctDistributionalPretreatmentBalanceRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const openDebtAxes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = selectDistributionalPlaceboQualifiedBridge(
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
      view?.cct?.distributionalPlaceboExercises
    );
    if (!selected) this.terminal("CCT_DISTRIBUTIONAL_PRETREATMENT_PLACEBOS_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
