import { readFileSync } from "node:fs";
import { REQUIRED_DEPENDENCY_CLASSES } from "../sequenced-restoration-v2.3-dependency-detectability/runtime.mjs";
import {
  CctSubthresholdCompositionRuntime,
  selectSubthresholdQualifiedBridge
} from "../sequenced-restoration-v2.4-subthreshold-composition/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function validateCrossClassPairsSpec(candidate = SPEC) {
  return candidate?.schema === "cct-cross-class-pairs/v1"
    && candidate?.version === "2.5-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-2.4-SUBTHRESHOLD-COMPOSITION-CANDIDATE-001";
}

export function requiredClassPairs() {
  const pairs = [];
  for (let left = 0; left < REQUIRED_DEPENDENCY_CLASSES.length; left += 1) {
    for (let right = left + 1; right < REQUIRED_DEPENDENCY_CLASSES.length; right += 1) {
      pairs.push([REQUIRED_DEPENDENCY_CLASSES[left], REQUIRED_DEPENDENCY_CLASSES[right]]);
    }
  }
  return pairs;
}

export function assessCrossClassPairs(openDebtAxes, dependencyAudit, exercise) {
  const thresholds = dependencyAudit?.materialityThresholds;
  const windowTicks = exercise?.windowTicks;
  const trials = exercise?.pairTrials;
  const failures = [];
  if (!thresholds || !Number.isInteger(windowTicks) || windowTicks < 1 || !Array.isArray(trials)) {
    return { status: "not_established", failures: ["invalid_exercise"] };
  }

  for (const pair of requiredClassPairs()) {
    const pairId = pair.join("+");
    const trial = trials.find((candidate) =>
      Array.isArray(candidate?.classes) && candidate.classes.join("+") === pairId
    );
    if (!trial || !Array.isArray(trial.components) || !Array.isArray(trial.sequences)) {
      failures.push({ pair: pairId, reason: "missing_pair_trial" });
      continue;
    }
    const componentsValid = pair.every((dependencyClass) => {
      const component = trial.components.find((candidate) => candidate?.dependencyClass === dependencyClass);
      return typeof component?.root === "string" && component.root
        && typeof component.impact === "number" && component.impact > 0
        && component.impact < thresholds[dependencyClass];
    }) && new Set(trial.components.map((component) => component.root)).size >= 2;
    if (!componentsValid) {
      failures.push({ pair: pairId, reason: "invalid_pair_components" });
      continue;
    }
    const requiredOrders = [pair, [...pair].reverse()];
    for (const order of requiredOrders) {
      const orderId = order.join("->");
      const sequence = trial.sequences.find((candidate) =>
        Array.isArray(candidate?.order) && candidate.order.join("->") === orderId
      );
      if (!sequence || !Array.isArray(sequence.observations)) {
        failures.push({ pair: pairId, order: orderId, reason: "missing_order_sequence" });
        continue;
      }
      const byTick = new Map(sequence.observations.map((observation) => [observation?.tick, observation]));
      for (let tick = 0; tick <= windowTicks; tick += 1) {
        const observation = byTick.get(tick);
        if (!observation) {
          failures.push({ pair: pairId, order: orderId, tick, reason: "window_incomplete" });
          continue;
        }
        const expectedApplied = tick === 0 ? [order[0]] : order;
        const applied = Array.isArray(observation.appliedClasses) ? observation.appliedClasses : [];
        if (applied.join("+") !== expectedApplied.join("+")) {
          failures.push({ pair: pairId, order: orderId, tick, reason: "perturbation_order_not_applied" });
        }
        const protectedAxes = new Set(Array.isArray(observation.protectedAxes) ? observation.protectedAxes : []);
        const missingAxes = openDebtAxes.filter((axis) => !protectedAxes.has(axis));
        if (missingAxes.length > 0) {
          failures.push({ pair: pairId, order: orderId, tick, reason: "cross_class_protection_gap", missingAxes });
        }
      }
    }
  }
  return {
    status: failures.length === 0 ? "bounded_pairwise_cross_class_candidate" : "not_established",
    failures
  };
}

export function selectCrossClassQualifiedBridge(
  actionOntology,
  allowedActions,
  openDebtAxes,
  bridgeExercises,
  failoverExercises,
  commonCauseExercises,
  dependencyAudits,
  subthresholdExercises,
  crossClassExercises
) {
  const qualified = allowedActions.filter((action) =>
    assessCrossClassPairs(openDebtAxes, dependencyAudits?.[action], crossClassExercises?.[action]).status
      === "bounded_pairwise_cross_class_candidate"
  );
  return selectSubthresholdQualifiedBridge(
    actionOntology,
    qualified,
    openDebtAxes,
    bridgeExercises,
    failoverExercises,
    commonCauseExercises,
    dependencyAudits,
    subthresholdExercises
  );
}

export class CctCrossClassPairsRuntime extends CctSubthresholdCompositionRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") {
      return super.decide({ view, allowedActions, history, predictionKeys });
    }
    const openDebtAxes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = selectCrossClassQualifiedBridge(
      view?.cct?.actionOntology,
      allowedActions,
      openDebtAxes,
      view?.cct?.bridgeExercises,
      view?.cct?.failoverExercises,
      view?.cct?.commonCauseExercises,
      view?.cct?.dependencyAudits,
      view?.cct?.subthresholdExercises,
      view?.cct?.crossClassExercises
    );
    if (!selected) this.terminal("CCT_CROSS_CLASS_PAIR_TOLERANCE_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}

