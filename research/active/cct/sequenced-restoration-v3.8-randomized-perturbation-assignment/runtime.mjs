import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  assessObservedPerturbationEffects,
  CctObservedPerturbationEffectsRuntime,
  selectObservedPerturbationQualifiedBridge
} from "../sequenced-restoration-v3.7-observed-perturbation-effects/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function validateRandomizedAssignmentSpec(candidate = SPEC) {
  return candidate?.schema === "cct-randomized-perturbation-assignment/v1"
    && candidate?.version === "3.8-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-3.7-OBSERVED-PERTURBATION-EFFECTS-CANDIDATE-001"
    && candidate?.assignmentMethod === "blocked_randomized"
    && candidate?.minimumBlockCount === 20
    && candidate?.maximumArmAttrition === 0.05
    && candidate?.maximumDifferentialAttrition === 0.01;
}

function allComparisons(exercise) {
  return exercise?.crossSignalPerturbations?.flatMap((challenge) =>
    challenge?.probes?.flatMap((probe) => probe?.effects?.map((effect) => ({ challenge, probe, effect })) ?? []) ?? []
  ) ?? [];
}

function assignmentProtocolInput(exercise) {
  return {
    schema: "cct-randomized-perturbation-assignment-protocol/v1",
    assignmentMethod: SPEC.assignmentMethod,
    minimumBlockCount: SPEC.minimumBlockCount,
    maximumArmAttrition: SPEC.maximumArmAttrition,
    maximumDifferentialAttrition: SPEC.maximumDifferentialAttrition,
    comparisons: allComparisons(exercise).map(({ challenge, probe, effect }) => ({
      target: `${challenge?.signalType}:${challenge?.signal}`,
      probeId: probe?.probeId,
      observed: `${effect?.signalType}:${effect?.signal}`,
      method: effect?.assignment?.method,
      samplingFrameRoot: effect?.assignment?.samplingFrameRoot,
      blockCount: effect?.assignment?.blockCount,
      plannedPerArm: effect?.assignment?.plannedPerArm,
      seedCommitment: effect?.assignment?.seedCommitment,
      controller: effect?.assignment?.controller,
      failureDomain: effect?.assignment?.failureDomain
    }))
  };
}

export function computeAssignmentProtocolDigest(exercise) {
  return createHash("sha256").update(JSON.stringify(assignmentProtocolInput(exercise))).digest("hex");
}

export function computeSeedCommitment(seedReveal) {
  return createHash("sha256").update(seedReveal).digest("hex");
}

function validAssignment(effect, probe, protocolTick, measurementTick) {
  const assignment = effect?.assignment;
  if (assignment?.method !== SPEC.assignmentMethod
    || typeof assignment.samplingFrameRoot !== "string" || !assignment.samplingFrameRoot
    || !Number.isInteger(assignment.blockCount) || assignment.blockCount < SPEC.minimumBlockCount
    || !Number.isInteger(assignment.plannedPerArm) || assignment.plannedPerArm <= 0
    || typeof assignment.seedReveal !== "string" || !assignment.seedReveal
    || computeSeedCommitment(assignment.seedReveal) !== assignment.seedCommitment
    || typeof assignment.controller !== "string" || !assignment.controller
    || assignment.controller === effect.baseline.controller || assignment.controller === effect.perturbed.controller
    || typeof assignment.failureDomain !== "string" || !assignment.failureDomain
    || assignment.failureDomain === effect.baseline.failureDomain || assignment.failureDomain === effect.perturbed.failureDomain
    || !Number.isInteger(assignment.assignedAtTick) || assignment.assignedAtTick <= protocolTick
    || !Number.isInteger(assignment.seedRevealedAtTick) || assignment.seedRevealedAtTick < assignment.assignedAtTick
    || assignment.seedRevealedAtTick > measurementTick
    || assignment.actualBaselineAssigned !== assignment.plannedPerArm
    || assignment.actualPerturbedAssigned !== assignment.plannedPerArm
    || effect.baseline.sampleSize > assignment.actualBaselineAssigned
    || effect.perturbed.sampleSize > assignment.actualPerturbedAssigned) return false;

  const baselineAttrition = 1 - effect.baseline.sampleSize / assignment.actualBaselineAssigned;
  const perturbedAttrition = 1 - effect.perturbed.sampleSize / assignment.actualPerturbedAssigned;
  return baselineAttrition <= SPEC.maximumArmAttrition
    && perturbedAttrition <= SPEC.maximumArmAttrition
    && Math.abs(baselineAttrition - perturbedAttrition) <= SPEC.maximumDifferentialAttrition;
}

export function assessRandomizedPerturbationAssignment(openDebtAxes, dependencyAudit, exercise) {
  const observed = assessObservedPerturbationEffects(openDebtAxes, dependencyAudit, exercise);
  if (observed.status !== "bounded_observed_perturbation_effects_candidate") return observed;

  const commitment = exercise?.assignmentProtocolCommitment;
  if (!validateRandomizedAssignmentSpec()
    || commitment?.algorithm !== "sha256"
    || !Number.isInteger(commitment?.committedAtTick)
    || commitment.committedAtTick > exercise?.perturbationMeasurementCommitment?.committedAtTick
    || commitment.digest !== computeAssignmentProtocolDigest(exercise)) {
    return { status: "not_established", failures: ["invalid_assignment_protocol"] };
  }

  const comparisons = allComparisons(exercise);
  const frameRoots = [];
  const failures = [];
  for (const { challenge, probe, effect } of comparisons) {
    const comparison = `${challenge.signalType}:${challenge.signal}->${effect.signalType}:${effect.signal}`;
    if (!validAssignment(effect, probe, commitment.committedAtTick, exercise.perturbationMeasurementCommitment.committedAtTick)) {
      failures.push({ comparison, probeId: probe.probeId, reason: "randomized_assignment_or_attrition_invalid" });
    } else {
      frameRoots.push(effect.assignment.samplingFrameRoot);
    }
  }
  if (new Set(frameRoots).size !== frameRoots.length) failures.push({ reason: "sampling_frame_reused_across_comparisons" });
  return { status: failures.length === 0 ? "bounded_randomized_perturbation_assignment_candidate" : "not_established", failures };
}

export function selectRandomizedAssignmentQualifiedBridge(
  actionOntology, allowedActions, openDebtAxes, bridgeExercises, failoverExercises,
  commonCauseExercises, dependencyAudits, subthresholdExercises, crossClassExercises,
  tripleExercises, dualContextExercises, riskDirectedExercises, signalProvenanceExercises,
  signalTransportExercises, uncertaintyTransportExercises, clusterTransportExercises,
  clusterLineageExercises, portfolioLineageExercises, lineageAttestationExercises,
  crossSignalPerturbationExercises, observedPerturbationExercises, randomizedAssignmentExercises
) {
  const qualified = allowedActions.filter((action) =>
    assessRandomizedPerturbationAssignment(openDebtAxes, dependencyAudits?.[action], randomizedAssignmentExercises?.[action]).status
      === "bounded_randomized_perturbation_assignment_candidate"
  );
  return selectObservedPerturbationQualifiedBridge(
    actionOntology, qualified, openDebtAxes, bridgeExercises, failoverExercises,
    commonCauseExercises, dependencyAudits, subthresholdExercises, crossClassExercises,
    tripleExercises, dualContextExercises, riskDirectedExercises, signalProvenanceExercises,
    signalTransportExercises, uncertaintyTransportExercises, clusterTransportExercises,
    clusterLineageExercises, portfolioLineageExercises, lineageAttestationExercises,
    crossSignalPerturbationExercises, observedPerturbationExercises
  );
}

export class CctRandomizedPerturbationAssignmentRuntime extends CctObservedPerturbationEffectsRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const openDebtAxes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = selectRandomizedAssignmentQualifiedBridge(
      view?.cct?.actionOntology, allowedActions, openDebtAxes, view?.cct?.bridgeExercises,
      view?.cct?.failoverExercises, view?.cct?.commonCauseExercises, view?.cct?.dependencyAudits,
      view?.cct?.subthresholdExercises, view?.cct?.crossClassExercises, view?.cct?.tripleExercises,
      view?.cct?.dualContextExercises, view?.cct?.riskDirectedExercises,
      view?.cct?.signalProvenanceExercises, view?.cct?.signalTransportExercises,
      view?.cct?.uncertaintyTransportExercises, view?.cct?.clusterTransportExercises,
      view?.cct?.clusterLineageExercises, view?.cct?.portfolioLineageExercises,
      view?.cct?.lineageAttestationExercises, view?.cct?.crossSignalPerturbationExercises,
      view?.cct?.observedPerturbationExercises, view?.cct?.randomizedAssignmentExercises
    );
    if (!selected) this.terminal("CCT_PERTURBATION_ASSIGNMENT_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
