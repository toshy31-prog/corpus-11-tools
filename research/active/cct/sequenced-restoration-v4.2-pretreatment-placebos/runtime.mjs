import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  assessPretreatmentBalance,
  CctPretreatmentBalanceRuntime,
  selectPretreatmentBalancedBridge
} from "../sequenced-restoration-v4.1-pretreatment-balance/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function validatePretreatmentPlaceboSpec(candidate = SPEC) {
  return candidate?.schema === "cct-pretreatment-placebos/v1"
    && candidate?.version === "4.2-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-4.1-PRETREATMENT-BALANCE-CANDIDATE-001"
    && JSON.stringify(candidate?.requiredPlacebos) === JSON.stringify(["lagged_event_rate", "preperiod_access_loss", "unrelated_failure_rate"])
    && candidate?.comparisonCount === 270
    && candidate?.adjustedZCritical === 4
    && candidate?.maximumAbsolutePlaceboDifference === 0.05;
}

function probes(exercise) {
  return exercise?.crossSignalPerturbations?.flatMap((challenge) =>
    challenge?.probes?.map((probe) => ({ challenge, probe })) ?? []
  ) ?? [];
}

function placeboProtocolInput(exercise) {
  const stripCount = (arm) => ({
    schema: arm?.schema,
    sampleSize: arm?.sampleSize,
    sourceRoot: arm?.sourceRoot,
    controller: arm?.controller,
    failureDomain: arm?.failureDomain,
    measuredAtTick: arm?.measuredAtTick,
    blindToFutureAssignment: arm?.blindToFutureAssignment
  });
  return {
    schema: "cct-pretreatment-placebo-protocol/v1",
    requiredPlacebos: SPEC.requiredPlacebos,
    comparisonCount: SPEC.comparisonCount,
    adjustedZCritical: SPEC.adjustedZCritical,
    maximumAbsolutePlaceboDifference: SPEC.maximumAbsolutePlaceboDifference,
    probes: probes(exercise).map(({ challenge, probe }) => ({
      target: `${challenge?.signalType}:${challenge?.signal}`,
      probeId: probe?.probeId,
      placebos: probe?.pretreatmentPlacebos?.map((placebo) => ({
        outcome: placebo?.outcome,
        baseline: stripCount(placebo?.baseline),
        perturbed: stripCount(placebo?.perturbed)
      }))
    }))
  };
}

export function computePretreatmentPlaceboProtocolDigest(exercise) {
  return createHash("sha256").update(JSON.stringify(placeboProtocolInput(exercise))).digest("hex");
}

function wilsonInterval(arm) {
  if (!Number.isInteger(arm?.eventCount) || !Number.isInteger(arm?.sampleSize) || arm.sampleSize <= 0 || arm.eventCount < 0 || arm.eventCount > arm.sampleSize) return null;
  const p = arm.eventCount / arm.sampleSize;
  const z2 = SPEC.adjustedZCritical ** 2;
  const denominator = 1 + z2 / arm.sampleSize;
  const center = (p + z2 / (2 * arm.sampleSize)) / denominator;
  const half = SPEC.adjustedZCritical * Math.sqrt(p * (1 - p) / arm.sampleSize + z2 / (4 * arm.sampleSize ** 2)) / denominator;
  return [Math.max(0, center - half), Math.min(1, center + half)];
}

function validArm(arm, commitmentTick, assignmentTick) {
  return arm?.schema === "pretreatment-placebo-count/v1"
    && typeof arm.sourceRoot === "string" && arm.sourceRoot
    && typeof arm.controller === "string" && arm.controller
    && typeof arm.failureDomain === "string" && arm.failureDomain
    && arm.blindToFutureAssignment === true
    && Number.isInteger(arm.measuredAtTick) && arm.measuredAtTick > commitmentTick && arm.measuredAtTick < assignmentTick
    && wilsonInterval(arm) !== null;
}

export function assessPretreatmentPlacebos(openDebtAxes, dependencyAudit, exercise) {
  const balance = assessPretreatmentBalance(openDebtAxes, dependencyAudit, exercise);
  if (balance.status !== "bounded_pretreatment_balance_candidate") return balance;

  const commitment = exercise?.pretreatmentPlaceboCommitment;
  if (!validatePretreatmentPlaceboSpec()
    || commitment?.algorithm !== "sha256"
    || !Number.isInteger(commitment?.committedAtTick)
    || commitment.committedAtTick > exercise?.pretreatmentBalanceCommitment?.committedAtTick
    || commitment.digest !== computePretreatmentPlaceboProtocolDigest(exercise)) {
    return { status: "not_established", failures: ["invalid_pretreatment_placebo_protocol"] };
  }

  const failures = [];
  const sourceRoots = [];
  for (const { challenge, probe } of probes(exercise)) {
    const placebos = probe?.pretreatmentPlacebos;
    if (!Array.isArray(placebos) || placebos.length !== SPEC.requiredPlacebos.length
      || JSON.stringify(placebos.map((item) => item?.outcome).sort()) !== JSON.stringify([...SPEC.requiredPlacebos].sort())) {
      failures.push({ signal: `${challenge.signalType}:${challenge.signal}`, probeId: probe.probeId, reason: "placebo_set_not_exact" });
      continue;
    }
    for (const placebo of placebos) {
      const assignmentTick = probe.clusterRandomization.assignedAtTick;
      if (!validArm(placebo.baseline, commitment.committedAtTick, assignmentTick)
        || !validArm(placebo.perturbed, commitment.committedAtTick, assignmentTick)
        || placebo.baseline.sourceRoot === placebo.perturbed.sourceRoot
        || placebo.baseline.controller === placebo.perturbed.controller
        || placebo.baseline.failureDomain === placebo.perturbed.failureDomain) {
        failures.push({ signal: `${challenge.signalType}:${challenge.signal}`, probeId: probe.probeId, outcome: placebo.outcome, reason: "placebo_provenance_invalid" });
        continue;
      }
      sourceRoots.push(placebo.baseline.sourceRoot, placebo.perturbed.sourceRoot);
      const baseline = wilsonInterval(placebo.baseline);
      const perturbed = wilsonInterval(placebo.perturbed);
      const interval = [perturbed[0] - baseline[1], perturbed[1] - baseline[0]];
      if (Math.max(Math.abs(interval[0]), Math.abs(interval[1])) > SPEC.maximumAbsolutePlaceboDifference) {
        failures.push({ signal: `${challenge.signalType}:${challenge.signal}`, probeId: probe.probeId, outcome: placebo.outcome, reason: "pretreatment_placebo_difference_detected" });
      }
    }
  }
  if (new Set(sourceRoots).size !== sourceRoots.length) failures.push({ reason: "placebo_source_reused" });
  return { status: failures.length === 0 ? "bounded_pretreatment_placebo_candidate" : "not_established", failures };
}

export function selectPlaceboQualifiedBridge(
  actionOntology, allowedActions, openDebtAxes, bridgeExercises, failoverExercises,
  commonCauseExercises, dependencyAudits, subthresholdExercises, crossClassExercises,
  tripleExercises, dualContextExercises, riskDirectedExercises, signalProvenanceExercises,
  signalTransportExercises, uncertaintyTransportExercises, clusterTransportExercises,
  clusterLineageExercises, portfolioLineageExercises, lineageAttestationExercises,
  crossSignalPerturbationExercises, observedPerturbationExercises, randomizedAssignmentExercises,
  clusterInterferenceExercises, reproducibleRandomizationExercises, pretreatmentBalanceExercises,
  pretreatmentPlaceboExercises
) {
  const qualified = allowedActions.filter((action) =>
    assessPretreatmentPlacebos(openDebtAxes, dependencyAudits?.[action], pretreatmentPlaceboExercises?.[action]).status
      === "bounded_pretreatment_placebo_candidate"
  );
  return selectPretreatmentBalancedBridge(
    actionOntology, qualified, openDebtAxes, bridgeExercises, failoverExercises,
    commonCauseExercises, dependencyAudits, subthresholdExercises, crossClassExercises,
    tripleExercises, dualContextExercises, riskDirectedExercises, signalProvenanceExercises,
    signalTransportExercises, uncertaintyTransportExercises, clusterTransportExercises,
    clusterLineageExercises, portfolioLineageExercises, lineageAttestationExercises,
    crossSignalPerturbationExercises, observedPerturbationExercises, randomizedAssignmentExercises,
    clusterInterferenceExercises, reproducibleRandomizationExercises, pretreatmentBalanceExercises
  );
}

export class CctPretreatmentPlaceboRuntime extends CctPretreatmentBalanceRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const openDebtAxes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = selectPlaceboQualifiedBridge(
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
      view?.cct?.pretreatmentBalanceExercises, view?.cct?.pretreatmentPlaceboExercises
    );
    if (!selected) this.terminal("CCT_PRETREATMENT_PLACEBO_BALANCE_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
