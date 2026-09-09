import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  assessAttestedPortfolioLineage,
  CctLineageAttestationRuntime,
  selectAttestedLineageQualifiedBridge
} from "../sequenced-restoration-v3.5-lineage-attestation/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

function signalKey(signalType, signal) {
  return `${signalType}:${signal}`;
}

function portfolioSignals(exercise) {
  const pairs = exercise?.transportEvidence?.pairMargins?.map((record) => ({
    signalType: "pair_margin",
    signal: record?.pair?.join("+"),
    trials: record?.trials
  })) ?? [];
  const risks = exercise?.transportEvidence?.classRisks?.map((record) => ({
    signalType: "class_risk",
    signal: record?.dependencyClass,
    trials: record?.trials
  })) ?? [];
  return [...pairs, ...risks];
}

export function validateCrossSignalPerturbationSpec(candidate = SPEC) {
  return candidate?.schema === "cct-cross-signal-perturbation/v1"
    && candidate?.version === "3.6-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-3.5-LINEAGE-ATTESTATION-CANDIDATE-001"
    && candidate?.portfolioSignalCount === 45
    && candidate?.probesPerSignal === 2
    && candidate?.minimumTargetEffect === 0.2
    && candidate?.maximumNonTargetEffect === 0.05;
}

function perturbationProtocolInput(exercise) {
  return {
    schema: "cct-cross-signal-perturbation-protocol/v1",
    portfolioSignalCount: SPEC.portfolioSignalCount,
    probesPerSignal: SPEC.probesPerSignal,
    minimumTargetEffect: SPEC.minimumTargetEffect,
    maximumNonTargetEffect: SPEC.maximumNonTargetEffect,
    challenges: exercise?.crossSignalPerturbations?.map((challenge) => ({
      signalType: challenge?.signalType,
      signal: challenge?.signal,
      probes: challenge?.probes?.map((probe) => ({
        schema: probe?.schema,
        probeId: probe?.probeId,
        perturbedGeneratorRoots: probe?.perturbedGeneratorRoots,
        controller: probe?.controller,
        failureDomain: probe?.failureDomain,
        plannedObservationTick: probe?.plannedObservationTick,
        effectSignalKeys: probe?.effects?.map((effect) => signalKey(effect?.signalType, effect?.signal))
      }))
    }))
  };
}

export function computeCrossSignalPerturbationProtocolDigest(exercise) {
  return createHash("sha256").update(JSON.stringify(perturbationProtocolInput(exercise))).digest("hex");
}

function exactMembers(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length && actual.every((item, index) => item === expected[index]);
}

function expectedGeneratorRoots(signal) {
  return signal.trials.flatMap((trial) => trial.clusters.map((cluster) => cluster.generatorRoot)).sort();
}

export function assessCrossSignalPerturbations(openDebtAxes, dependencyAudit, exercise) {
  const attested = assessAttestedPortfolioLineage(openDebtAxes, dependencyAudit, exercise);
  if (attested.status !== "bounded_attested_portfolio_lineage_candidate") return attested;

  const commitment = exercise?.crossSignalPerturbationCommitment;
  if (!validateCrossSignalPerturbationSpec()
    || commitment?.algorithm !== "sha256"
    || !Number.isInteger(commitment?.committedAtTick)
    || commitment.committedAtTick > exercise?.lineageAttestationCommitment?.committedAtTick
    || commitment.digest !== computeCrossSignalPerturbationProtocolDigest(exercise)) {
    return { status: "not_established", failures: ["invalid_cross_signal_perturbation_protocol"] };
  }

  const signals = portfolioSignals(exercise);
  const signalKeys = signals.map((item) => signalKey(item.signalType, item.signal));
  const challenges = exercise?.crossSignalPerturbations;
  if (!Array.isArray(challenges) || challenges.length !== SPEC.portfolioSignalCount
    || new Set(challenges.map((item) => signalKey(item?.signalType, item?.signal))).size !== SPEC.portfolioSignalCount
    || challenges.some((item) => !signalKeys.includes(signalKey(item?.signalType, item?.signal)))) {
    return { status: "not_established", failures: ["perturbation_signal_set_not_exact"] };
  }

  const failures = [];
  for (const challenge of challenges) {
    const targetKey = signalKey(challenge.signalType, challenge.signal);
    const target = signals.find((item) => signalKey(item.signalType, item.signal) === targetKey);
    const probes = challenge.probes;
    if (!Array.isArray(probes) || probes.length !== SPEC.probesPerSignal
      || new Set(probes.map((probe) => probe?.probeId)).size !== SPEC.probesPerSignal
      || new Set(probes.map((probe) => probe?.controller)).size !== SPEC.probesPerSignal
      || new Set(probes.map((probe) => probe?.failureDomain)).size !== SPEC.probesPerSignal) {
      failures.push({ signal: targetKey, reason: "independent_perturbations_missing" });
      continue;
    }
    const generators = expectedGeneratorRoots(target);
    for (const probe of probes) {
      const effects = probe?.effects;
      const effectKeys = effects?.map((effect) => signalKey(effect?.signalType, effect?.signal));
      if (probe?.schema !== "generator-perturbation/v1"
        || !exactMembers([...(probe?.perturbedGeneratorRoots ?? [])].sort(), generators)
        || !Number.isInteger(probe?.observedAtTick)
        || probe.observedAtTick !== probe.plannedObservationTick
        || probe.observedAtTick <= commitment.committedAtTick
        || probe.observedAtTick >= exercise.firstExerciseTick
        || !Array.isArray(effects) || effects.length !== signalKeys.length
        || new Set(effectKeys).size !== signalKeys.length
        || effectKeys.some((key) => !signalKeys.includes(key))
        || effects.some((effect) => typeof effect.effectMagnitude !== "number" || effect.effectMagnitude < 0 || effect.effectMagnitude > 1)) {
        failures.push({ signal: targetKey, probeId: probe?.probeId, reason: "invalid_perturbation_observation" });
        continue;
      }
      const targetEffect = effects.find((effect) => signalKey(effect.signalType, effect.signal) === targetKey).effectMagnitude;
      if (targetEffect < SPEC.minimumTargetEffect) failures.push({ signal: targetKey, probeId: probe.probeId, reason: "target_perturbation_not_detected" });
      for (const effect of effects) {
        const affectedKey = signalKey(effect.signalType, effect.signal);
        if (affectedKey !== targetKey && effect.effectMagnitude > SPEC.maximumNonTargetEffect) {
          failures.push({ signal: targetKey, affectedSignal: affectedKey, probeId: probe.probeId, reason: "cross_signal_perturbation_detected" });
        }
      }
    }
  }

  return { status: failures.length === 0 ? "bounded_cross_signal_perturbation_candidate" : "not_established", failures };
}

export function selectPerturbationQualifiedBridge(
  actionOntology, allowedActions, openDebtAxes, bridgeExercises, failoverExercises,
  commonCauseExercises, dependencyAudits, subthresholdExercises, crossClassExercises,
  tripleExercises, dualContextExercises, riskDirectedExercises, signalProvenanceExercises,
  signalTransportExercises, uncertaintyTransportExercises, clusterTransportExercises,
  clusterLineageExercises, portfolioLineageExercises, lineageAttestationExercises,
  crossSignalPerturbationExercises
) {
  const qualified = allowedActions.filter((action) =>
    assessCrossSignalPerturbations(openDebtAxes, dependencyAudits?.[action], crossSignalPerturbationExercises?.[action]).status
      === "bounded_cross_signal_perturbation_candidate"
  );
  return selectAttestedLineageQualifiedBridge(
    actionOntology, qualified, openDebtAxes, bridgeExercises, failoverExercises,
    commonCauseExercises, dependencyAudits, subthresholdExercises, crossClassExercises,
    tripleExercises, dualContextExercises, riskDirectedExercises, signalProvenanceExercises,
    signalTransportExercises, uncertaintyTransportExercises, clusterTransportExercises,
    clusterLineageExercises, portfolioLineageExercises, lineageAttestationExercises
  );
}

export class CctCrossSignalPerturbationRuntime extends CctLineageAttestationRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const openDebtAxes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = selectPerturbationQualifiedBridge(
      view?.cct?.actionOntology, allowedActions, openDebtAxes, view?.cct?.bridgeExercises,
      view?.cct?.failoverExercises, view?.cct?.commonCauseExercises, view?.cct?.dependencyAudits,
      view?.cct?.subthresholdExercises, view?.cct?.crossClassExercises, view?.cct?.tripleExercises,
      view?.cct?.dualContextExercises, view?.cct?.riskDirectedExercises,
      view?.cct?.signalProvenanceExercises, view?.cct?.signalTransportExercises,
      view?.cct?.uncertaintyTransportExercises, view?.cct?.clusterTransportExercises,
      view?.cct?.clusterLineageExercises, view?.cct?.portfolioLineageExercises,
      view?.cct?.lineageAttestationExercises, view?.cct?.crossSignalPerturbationExercises
    );
    if (!selected) this.terminal("CCT_CROSS_SIGNAL_COMMON_CAUSE_UNRESOLVED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
