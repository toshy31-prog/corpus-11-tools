import { readFileSync } from "node:fs";
import {
  CctDependencyDetectabilityRuntime,
  REQUIRED_DEPENDENCY_CLASSES,
  selectDetectabilityQualifiedBridge
} from "../sequenced-restoration-v2.3-dependency-detectability/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function validateSubthresholdCompositionSpec(candidate = SPEC) {
  return candidate?.schema === "cct-subthreshold-composition/v1"
    && candidate?.version === "2.4-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-2.3-DEPENDENCY-DETECTABILITY-CANDIDATE-001";
}

export function assessSubthresholdComposition(openDebtAxes, dependencyAudit, exercise) {
  const thresholds = dependencyAudit?.materialityThresholds;
  const windowTicks = exercise?.windowTicks;
  const trials = exercise?.classTrials;
  const failures = [];
  if (!thresholds || !Number.isInteger(windowTicks) || windowTicks < 0 || !Array.isArray(trials)) {
    return { status: "not_established", failures: ["invalid_exercise"] };
  }

  for (const dependencyClass of REQUIRED_DEPENDENCY_CLASSES) {
    const threshold = thresholds[dependencyClass];
    const trial = trials.find((candidate) => candidate?.dependencyClass === dependencyClass);
    if (!trial || !Array.isArray(trial.components) || !Array.isArray(trial.aggregationOutcomes)
      || !Array.isArray(trial.observations)) {
      failures.push({ dependencyClass, reason: "missing_class_trial" });
      continue;
    }
    const componentsValid = trial.components.length >= 2
      && trial.components.every((component) => typeof component?.root === "string" && component.root
        && typeof component.impact === "number" && component.impact > 0 && component.impact < threshold)
      && new Set(trial.components.map((component) => component.root)).size >= 2;
    if (!componentsValid) {
      failures.push({ dependencyClass, reason: "not_a_subthreshold_composition" });
      continue;
    }
    const maps = trial.aggregationOutcomes;
    const mapIds = new Set(maps.map((outcome) => outcome?.mapId));
    const mapControllers = new Set(maps.map((outcome) => outcome?.controller));
    const mapSourceRoots = new Set(maps.map((outcome) => outcome?.sourceRoot));
    if (maps.length < 2 || mapIds.size < 2 || mapControllers.size < 2 || mapSourceRoots.size < 2
      || maps.some((outcome) => typeof outcome?.controller !== "string" || !outcome.controller
        || typeof outcome?.sourceRoot !== "string" || !outcome.sourceRoot)
      || maps.some((outcome) => typeof outcome?.aggregateImpact !== "number"
        || !Number.isFinite(outcome.aggregateImpact)
        || outcome.aggregateImpact < threshold)) {
      failures.push({ dependencyClass, reason: "aggregation_dependent_materiality" });
      continue;
    }
    const byTick = new Map(trial.observations.map((observation) => [observation?.tick, observation]));
    for (let tick = 0; tick <= windowTicks; tick += 1) {
      const observation = byTick.get(tick);
      if (!observation) {
        failures.push({ dependencyClass, tick, reason: "window_incomplete" });
        continue;
      }
      const protectedAxes = new Set(Array.isArray(observation.protectedAxes) ? observation.protectedAxes : []);
      const missingAxes = openDebtAxes.filter((axis) => !protectedAxes.has(axis));
      if (missingAxes.length > 0) {
        failures.push({ dependencyClass, tick, reason: "composed_protection_gap", missingAxes });
      }
    }
  }
  return {
    status: failures.length === 0 ? "bounded_subthreshold_tolerance_candidate" : "not_established",
    failures
  };
}

export function selectSubthresholdQualifiedBridge(
  actionOntology,
  allowedActions,
  openDebtAxes,
  bridgeExercises,
  failoverExercises,
  commonCauseExercises,
  dependencyAudits,
  subthresholdExercises
) {
  const qualified = allowedActions.filter((action) =>
    assessSubthresholdComposition(openDebtAxes, dependencyAudits?.[action], subthresholdExercises?.[action]).status
      === "bounded_subthreshold_tolerance_candidate"
  );
  return selectDetectabilityQualifiedBridge(
    actionOntology,
    qualified,
    openDebtAxes,
    bridgeExercises,
    failoverExercises,
    commonCauseExercises,
    dependencyAudits
  );
}

export class CctSubthresholdCompositionRuntime extends CctDependencyDetectabilityRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") {
      return super.decide({ view, allowedActions, history, predictionKeys });
    }
    const openDebtAxes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = selectSubthresholdQualifiedBridge(
      view?.cct?.actionOntology,
      allowedActions,
      openDebtAxes,
      view?.cct?.bridgeExercises,
      view?.cct?.failoverExercises,
      view?.cct?.commonCauseExercises,
      view?.cct?.dependencyAudits,
      view?.cct?.subthresholdExercises
    );
    if (!selected) this.terminal("CCT_SUBTHRESHOLD_COMPOSITION_TOLERANCE_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
