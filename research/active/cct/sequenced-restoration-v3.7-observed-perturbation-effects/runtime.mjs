import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  assessCrossSignalPerturbations,
  CctCrossSignalPerturbationRuntime,
  selectPerturbationQualifiedBridge
} from "../sequenced-restoration-v3.6-cross-signal-perturbation/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function validateObservedPerturbationEffectsSpec(candidate = SPEC) {
  return candidate?.schema === "cct-observed-perturbation-effects/v1"
    && candidate?.version === "3.7-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-3.6-CROSS-SIGNAL-PERTURBATION-CANDIDATE-001"
    && candidate?.comparisonCount === 4050
    && candidate?.minimumArmSampleSize === 10000
    && candidate?.adjustedZCritical === 4.4
    && candidate?.minimumTargetEffect === 0.2
    && candidate?.maximumNonTargetEffect === 0.05;
}

function allEffects(exercise) {
  return exercise?.crossSignalPerturbations?.flatMap((challenge) =>
    challenge?.probes?.flatMap((probe) => probe?.effects?.map((effect) => ({ challenge, probe, effect })) ?? []) ?? []
  ) ?? [];
}

function armProtocol(arm) {
  return {
    schema: arm?.schema,
    sampleSize: arm?.sampleSize,
    sourceRoot: arm?.sourceRoot,
    controller: arm?.controller,
    failureDomain: arm?.failureDomain,
    measuredAtTick: arm?.measuredAtTick
  };
}

function measurementProtocolInput(exercise) {
  return {
    schema: "cct-observed-perturbation-effects-protocol/v1",
    comparisonCount: SPEC.comparisonCount,
    minimumArmSampleSize: SPEC.minimumArmSampleSize,
    adjustedZCritical: SPEC.adjustedZCritical,
    minimumTargetEffect: SPEC.minimumTargetEffect,
    maximumNonTargetEffect: SPEC.maximumNonTargetEffect,
    comparisons: allEffects(exercise).map(({ challenge, probe, effect }) => ({
      target: `${challenge?.signalType}:${challenge?.signal}`,
      probeId: probe?.probeId,
      observed: `${effect?.signalType}:${effect?.signal}`,
      baseline: armProtocol(effect?.baseline),
      perturbed: armProtocol(effect?.perturbed)
    }))
  };
}

export function computePerturbationMeasurementProtocolDigest(exercise) {
  return createHash("sha256").update(JSON.stringify(measurementProtocolInput(exercise))).digest("hex");
}

function wilsonInterval(count, sampleSize) {
  if (!Number.isInteger(count) || !Number.isInteger(sampleSize) || sampleSize < SPEC.minimumArmSampleSize || count < 0 || count > sampleSize) return null;
  const proportion = count / sampleSize;
  const zSquared = SPEC.adjustedZCritical ** 2;
  const denominator = 1 + zSquared / sampleSize;
  const center = (proportion + zSquared / (2 * sampleSize)) / denominator;
  const halfWidth = SPEC.adjustedZCritical * Math.sqrt(proportion * (1 - proportion) / sampleSize + zSquared / (4 * sampleSize ** 2)) / denominator;
  return [Math.max(0, center - halfWidth), Math.min(1, center + halfWidth)];
}

function effectInterval(effect) {
  const baseline = wilsonInterval(effect?.baseline?.eventCount, effect?.baseline?.sampleSize);
  const perturbed = wilsonInterval(effect?.perturbed?.eventCount, effect?.perturbed?.sampleSize);
  return baseline && perturbed ? [perturbed[0] - baseline[1], perturbed[1] - baseline[0]] : null;
}

function validArm(arm, probe, commitmentTick) {
  return arm?.schema === "perturbation-effect-count/v1"
    && typeof arm.sourceRoot === "string" && arm.sourceRoot
    && typeof arm.controller === "string" && arm.controller && arm.controller !== probe.controller
    && typeof arm.failureDomain === "string" && arm.failureDomain && arm.failureDomain !== probe.failureDomain
    && Number.isInteger(arm.measuredAtTick) && arm.measuredAtTick === probe.observedAtTick
    && arm.measuredAtTick > commitmentTick
    && Number.isInteger(arm.sampleSize) && arm.sampleSize >= SPEC.minimumArmSampleSize
    && Number.isInteger(arm.eventCount) && arm.eventCount >= 0 && arm.eventCount <= arm.sampleSize;
}

export function assessObservedPerturbationEffects(openDebtAxes, dependencyAudit, exercise) {
  const perturbations = assessCrossSignalPerturbations(openDebtAxes, dependencyAudit, exercise);
  if (perturbations.status !== "bounded_cross_signal_perturbation_candidate") return perturbations;

  const commitment = exercise?.perturbationMeasurementCommitment;
  if (!validateObservedPerturbationEffectsSpec()
    || commitment?.algorithm !== "sha256"
    || !Number.isInteger(commitment?.committedAtTick)
    || commitment.committedAtTick > exercise?.crossSignalPerturbationCommitment?.committedAtTick
    || commitment.digest !== computePerturbationMeasurementProtocolDigest(exercise)) {
    return { status: "not_established", failures: ["invalid_perturbation_measurement_protocol"] };
  }

  const comparisons = allEffects(exercise);
  if (comparisons.length !== SPEC.comparisonCount) return { status: "not_established", failures: ["measurement_comparison_set_not_exact"] };
  const sourceRoots = [];
  const failures = [];
  for (const { challenge, probe, effect } of comparisons) {
    const targetKey = `${challenge.signalType}:${challenge.signal}`;
    const observedKey = `${effect.signalType}:${effect.signal}`;
    if (!validArm(effect.baseline, probe, commitment.committedAtTick)
      || !validArm(effect.perturbed, probe, commitment.committedAtTick)
      || effect.baseline.sourceRoot === effect.perturbed.sourceRoot
      || effect.baseline.controller === effect.perturbed.controller
      || effect.baseline.failureDomain === effect.perturbed.failureDomain) {
      failures.push({ target: targetKey, observed: observedKey, probeId: probe.probeId, reason: "effect_measurement_provenance_invalid" });
      continue;
    }
    sourceRoots.push(effect.baseline.sourceRoot, effect.perturbed.sourceRoot);
    const pointEffect = Math.abs(effect.perturbed.eventCount / effect.perturbed.sampleSize - effect.baseline.eventCount / effect.baseline.sampleSize);
    if (Math.abs(pointEffect - effect.effectMagnitude) > Number.EPSILON * 8) {
      failures.push({ target: targetKey, observed: observedKey, probeId: probe.probeId, reason: "declared_effect_does_not_match_counts" });
      continue;
    }
    const interval = effectInterval(effect);
    if (!interval) {
      failures.push({ target: targetKey, observed: observedKey, probeId: probe.probeId, reason: "effect_interval_unavailable" });
    } else if (targetKey === observedKey && interval[0] < SPEC.minimumTargetEffect) {
      failures.push({ target: targetKey, probeId: probe.probeId, reason: "target_effect_interval_below_threshold" });
    } else if (targetKey !== observedKey && Math.max(Math.abs(interval[0]), Math.abs(interval[1])) > SPEC.maximumNonTargetEffect) {
      failures.push({ target: targetKey, observed: observedKey, probeId: probe.probeId, reason: "non_target_effect_interval_crosses_limit" });
    }
  }
  if (new Set(sourceRoots).size !== sourceRoots.length) failures.push({ reason: "measurement_source_reused" });

  return { status: failures.length === 0 ? "bounded_observed_perturbation_effects_candidate" : "not_established", failures };
}

export function selectObservedPerturbationQualifiedBridge(
  actionOntology, allowedActions, openDebtAxes, bridgeExercises, failoverExercises,
  commonCauseExercises, dependencyAudits, subthresholdExercises, crossClassExercises,
  tripleExercises, dualContextExercises, riskDirectedExercises, signalProvenanceExercises,
  signalTransportExercises, uncertaintyTransportExercises, clusterTransportExercises,
  clusterLineageExercises, portfolioLineageExercises, lineageAttestationExercises,
  crossSignalPerturbationExercises, observedPerturbationExercises
) {
  const qualified = allowedActions.filter((action) =>
    assessObservedPerturbationEffects(openDebtAxes, dependencyAudits?.[action], observedPerturbationExercises?.[action]).status
      === "bounded_observed_perturbation_effects_candidate"
  );
  return selectPerturbationQualifiedBridge(
    actionOntology, qualified, openDebtAxes, bridgeExercises, failoverExercises,
    commonCauseExercises, dependencyAudits, subthresholdExercises, crossClassExercises,
    tripleExercises, dualContextExercises, riskDirectedExercises, signalProvenanceExercises,
    signalTransportExercises, uncertaintyTransportExercises, clusterTransportExercises,
    clusterLineageExercises, portfolioLineageExercises, lineageAttestationExercises,
    crossSignalPerturbationExercises
  );
}

export class CctObservedPerturbationEffectsRuntime extends CctCrossSignalPerturbationRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const openDebtAxes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = selectObservedPerturbationQualifiedBridge(
      view?.cct?.actionOntology, allowedActions, openDebtAxes, view?.cct?.bridgeExercises,
      view?.cct?.failoverExercises, view?.cct?.commonCauseExercises, view?.cct?.dependencyAudits,
      view?.cct?.subthresholdExercises, view?.cct?.crossClassExercises, view?.cct?.tripleExercises,
      view?.cct?.dualContextExercises, view?.cct?.riskDirectedExercises,
      view?.cct?.signalProvenanceExercises, view?.cct?.signalTransportExercises,
      view?.cct?.uncertaintyTransportExercises, view?.cct?.clusterTransportExercises,
      view?.cct?.clusterLineageExercises, view?.cct?.portfolioLineageExercises,
      view?.cct?.lineageAttestationExercises, view?.cct?.crossSignalPerturbationExercises,
      view?.cct?.observedPerturbationExercises
    );
    if (!selected) this.terminal("CCT_PERTURBATION_EFFECT_EVIDENCE_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
