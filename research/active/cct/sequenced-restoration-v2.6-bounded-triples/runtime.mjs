import { readFileSync } from "node:fs";
import { REQUIRED_DEPENDENCY_CLASSES } from "../sequenced-restoration-v2.3-dependency-detectability/runtime.mjs";
import {
  CctCrossClassPairsRuntime,
  selectCrossClassQualifiedBridge
} from "../sequenced-restoration-v2.5-cross-class-pairs/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function validateBoundedTriplesSpec(candidate = SPEC) {
  return candidate?.schema === "cct-bounded-triples/v1"
    && candidate?.version === "2.6-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-2.5-CROSS-CLASS-PAIRS-CANDIDATE-001";
}

export function requiredTripleCover() {
  const points = REQUIRED_DEPENDENCY_CLASSES;
  const triples = [];
  for (let row = 0; row < 3; row += 1) {
    triples.push([0, 1, 2].map((column) => points[(row * 3) + column]));
  }
  for (let column = 0; column < 3; column += 1) {
    triples.push([0, 1, 2].map((row) => points[(row * 3) + column]));
  }
  for (const slope of [1, 2]) {
    for (let intercept = 0; intercept < 3; intercept += 1) {
      triples.push([0, 1, 2].map((row) => {
        const column = ((slope * row) + intercept) % 3;
        return points[(row * 3) + column];
      }));
    }
  }
  return triples;
}

export function permutations(values) {
  if (values.length <= 1) return [values];
  return values.flatMap((value, index) =>
    permutations(values.filter((_, candidateIndex) => candidateIndex !== index))
      .map((suffix) => [value, ...suffix])
  );
}

export function tripleCoverProperties(triples = requiredTripleCover()) {
  const classCounts = Object.fromEntries(REQUIRED_DEPENDENCY_CLASSES.map((name) => [name, 0]));
  const pairCounts = new Map();
  for (const triple of triples) {
    for (const dependencyClass of triple) classCounts[dependencyClass] += 1;
    for (let left = 0; left < triple.length; left += 1) {
      for (let right = left + 1; right < triple.length; right += 1) {
        const pair = [triple[left], triple[right]].sort().join("+");
        pairCounts.set(pair, (pairCounts.get(pair) ?? 0) + 1);
      }
    }
  }
  return {
    tripleCount: triples.length,
    uniquePairCount: pairCounts.size,
    everyPairExactlyOnce: [...pairCounts.values()].every((count) => count === 1),
    classCounts
  };
}

export function assessBoundedTriples(openDebtAxes, dependencyAudit, exercise, cover = requiredTripleCover()) {
  const thresholds = dependencyAudit?.materialityThresholds;
  const windowTicks = exercise?.windowTicks;
  const trials = exercise?.tripleTrials;
  const failures = [];
  if (!thresholds || !Number.isInteger(windowTicks) || windowTicks < 2 || !Array.isArray(trials)) {
    return { status: "not_established", failures: ["invalid_exercise"] };
  }

  const expectedIds = new Set(cover.map((triple) => triple.join("+")));
  const submittedIds = trials.map((trial) => Array.isArray(trial?.classes) ? trial.classes.join("+") : "");
  if (trials.length !== cover.length || new Set(submittedIds).size !== trials.length
    || submittedIds.some((id) => !expectedIds.has(id))) {
    failures.push({ reason: "invalid_triple_cover" });
  }

  for (const triple of cover) {
    const tripleId = triple.join("+");
    const trial = trials.find((candidate) =>
      Array.isArray(candidate?.classes) && candidate.classes.join("+") === tripleId
    );
    if (!trial || !Array.isArray(trial.components) || !Array.isArray(trial.sequences)) {
      failures.push({ triple: tripleId, reason: "missing_triple_trial" });
      continue;
    }
    const componentsValid = triple.every((dependencyClass) => {
      const component = trial.components.find((candidate) => candidate?.dependencyClass === dependencyClass);
      return typeof component?.root === "string" && component.root
        && typeof component.impact === "number" && Number.isFinite(component.impact)
        && component.impact > 0 && component.impact < thresholds[dependencyClass];
    }) && trial.components.length === 3
      && new Set(trial.components.map((component) => component.root)).size === 3;
    if (!componentsValid) {
      failures.push({ triple: tripleId, reason: "invalid_triple_components" });
      continue;
    }

    const requiredOrders = permutations(triple);
    const submittedOrders = trial.sequences.map((sequence) =>
      Array.isArray(sequence?.order) ? sequence.order.join("->") : ""
    );
    if (trial.sequences.length !== requiredOrders.length
      || new Set(submittedOrders).size !== trial.sequences.length) {
      failures.push({ triple: tripleId, reason: "invalid_order_set" });
    }
    for (const order of requiredOrders) {
      const orderId = order.join("->");
      const sequence = trial.sequences.find((candidate) =>
        Array.isArray(candidate?.order) && candidate.order.join("->") === orderId
      );
      if (!sequence || !Array.isArray(sequence.observations)) {
        failures.push({ triple: tripleId, order: orderId, reason: "missing_order_sequence" });
        continue;
      }
      const byTick = new Map(sequence.observations.map((observation) => [observation?.tick, observation]));
      if (sequence.observations.length !== windowTicks + 1 || byTick.size !== windowTicks + 1) {
        failures.push({ triple: tripleId, order: orderId, reason: "invalid_observation_window" });
      }
      for (let tick = 0; tick <= windowTicks; tick += 1) {
        const observation = byTick.get(tick);
        if (!observation) {
          failures.push({ triple: tripleId, order: orderId, tick, reason: "window_incomplete" });
          continue;
        }
        const expectedApplied = order.slice(0, Math.min(tick + 1, 3));
        const applied = Array.isArray(observation.appliedClasses) ? observation.appliedClasses : [];
        if (applied.join("+") !== expectedApplied.join("+")) {
          failures.push({ triple: tripleId, order: orderId, tick, reason: "perturbation_order_not_applied" });
        }
        const protectedAxes = new Set(Array.isArray(observation.protectedAxes) ? observation.protectedAxes : []);
        const missingAxes = openDebtAxes.filter((axis) => !protectedAxes.has(axis));
        if (missingAxes.length > 0) {
          failures.push({ triple: tripleId, order: orderId, tick, reason: "three_way_protection_gap", missingAxes });
        }
      }
    }
  }
  return {
    status: failures.length === 0 ? "bounded_three_way_interaction_candidate" : "not_established",
    failures
  };
}

export function selectTripleQualifiedBridge(
  actionOntology,
  allowedActions,
  openDebtAxes,
  bridgeExercises,
  failoverExercises,
  commonCauseExercises,
  dependencyAudits,
  subthresholdExercises,
  crossClassExercises,
  tripleExercises
) {
  const qualified = allowedActions.filter((action) =>
    assessBoundedTriples(openDebtAxes, dependencyAudits?.[action], tripleExercises?.[action]).status
      === "bounded_three_way_interaction_candidate"
  );
  return selectCrossClassQualifiedBridge(
    actionOntology,
    qualified,
    openDebtAxes,
    bridgeExercises,
    failoverExercises,
    commonCauseExercises,
    dependencyAudits,
    subthresholdExercises,
    crossClassExercises
  );
}

export class CctBoundedTriplesRuntime extends CctCrossClassPairsRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") {
      return super.decide({ view, allowedActions, history, predictionKeys });
    }
    const openDebtAxes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = selectTripleQualifiedBridge(
      view?.cct?.actionOntology,
      allowedActions,
      openDebtAxes,
      view?.cct?.bridgeExercises,
      view?.cct?.failoverExercises,
      view?.cct?.commonCauseExercises,
      view?.cct?.dependencyAudits,
      view?.cct?.subthresholdExercises,
      view?.cct?.crossClassExercises,
      view?.cct?.tripleExercises
    );
    if (!selected) this.terminal("CCT_BOUNDED_TRIPLE_TOLERANCE_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
