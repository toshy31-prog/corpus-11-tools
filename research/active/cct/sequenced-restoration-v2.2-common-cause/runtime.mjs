import { readFileSync } from "node:fs";
import {
  CctTemporalFailoverRuntime,
  selectTemporallyVerifiedBridge
} from "../sequenced-restoration-v2.1-temporal-failover/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function validateCommonCauseSpec(candidate = SPEC) {
  return candidate?.schema === "cct-bridge-common-cause/v1"
    && candidate?.version === "2.2-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-2.1-TEMPORAL-FAILOVER-CANDIDATE-001";
}

export function assessCommonCauseExercise(semantics, openDebtAxes, exercise) {
  const lanes = semantics?.continuityLanes;
  const windowTicks = exercise?.windowTicks;
  const trials = exercise?.dependencyTrials;
  if (!Array.isArray(lanes) || lanes.length < 2) {
    return { status: "independence_unknown", failures: ["insufficient_lanes"] };
  }
  if (!lanes.every((lane) => Array.isArray(lane?.dependencyRoots) && lane.dependencyRoots.length > 0)) {
    return { status: "independence_unknown", failures: ["dependency_inventory_incomplete"] };
  }
  if (!Number.isInteger(windowTicks) || windowTicks < 0 || !Array.isArray(trials)) {
    return { status: "independence_unknown", failures: ["invalid_exercise"] };
  }

  const dependencyRoots = [...new Set(lanes.flatMap((lane) => lane.dependencyRoots))].sort();
  const failures = [];
  for (const dependencyRoot of dependencyRoots) {
    const disabledLanes = lanes
      .map((lane, index) => lane.dependencyRoots.includes(dependencyRoot) ? index : null)
      .filter((index) => index !== null);
    const trial = trials.find((candidate) => candidate?.dependencyRoot === dependencyRoot);
    if (!trial || !Array.isArray(trial.observations)) {
      failures.push({ dependencyRoot, reason: "missing_dependency_trial" });
      continue;
    }
    const byTick = new Map(trial.observations.map((observation) => [observation?.tick, observation]));
    for (let tick = 0; tick <= windowTicks; tick += 1) {
      const observation = byTick.get(tick);
      if (!observation) {
        failures.push({ dependencyRoot, tick, reason: "window_incomplete" });
        continue;
      }
      const activeLanes = Array.isArray(observation.activeLanes) ? observation.activeLanes : [];
      const disabledStillActive = activeLanes.filter((lane) => disabledLanes.includes(lane));
      if (disabledStillActive.length > 0) {
        failures.push({ dependencyRoot, tick, reason: "perturbation_not_applied", lanes: disabledStillActive });
      }
      const invalidLane = activeLanes.find((lane) => !Number.isInteger(lane) || lane < 0 || lane >= lanes.length);
      if (invalidLane !== undefined) {
        failures.push({ dependencyRoot, tick, reason: "invalid_active_lane", lane: invalidLane });
      }
      const supportedAxes = new Set(activeLanes.flatMap((lane) => lanes[lane]?.protectsAxes ?? []));
      const observedAxes = new Set(Array.isArray(observation.protectedAxes) ? observation.protectedAxes : []);
      const unsupportedAxes = openDebtAxes.filter((axis) => !supportedAxes.has(axis));
      const unobservedAxes = openDebtAxes.filter((axis) => !observedAxes.has(axis));
      if (unsupportedAxes.length > 0) {
        failures.push({ dependencyRoot, tick, reason: "common_cause_gap", missingAxes: unsupportedAxes });
      }
      if (unobservedAxes.length > 0) {
        failures.push({ dependencyRoot, tick, reason: "observed_protection_gap", missingAxes: unobservedAxes });
      }
    }
  }
  return {
    status: failures.length === 0 ? "bounded_common_cause_candidate" : "substantially_dependent",
    failures
  };
}

export function selectCommonCauseQualifiedBridge(
  actionOntology,
  allowedActions,
  openDebtAxes,
  bridgeExercises,
  failoverExercises,
  commonCauseExercises
) {
  const qualified = allowedActions.filter((action) =>
    assessCommonCauseExercise(actionOntology?.[action], openDebtAxes, commonCauseExercises?.[action]).status
      === "bounded_common_cause_candidate"
  );
  return selectTemporallyVerifiedBridge(
    actionOntology,
    qualified,
    openDebtAxes,
    bridgeExercises,
    failoverExercises
  );
}

export class CctCommonCauseRuntime extends CctTemporalFailoverRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") {
      return super.decide({ view, allowedActions, history, predictionKeys });
    }
    const openDebtAxes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = selectCommonCauseQualifiedBridge(
      view?.cct?.actionOntology,
      allowedActions,
      openDebtAxes,
      view?.cct?.bridgeExercises,
      view?.cct?.failoverExercises,
      view?.cct?.commonCauseExercises
    );
    if (!selected) this.terminal("CCT_EVIDENCE_BRIDGE_COMMON_CAUSE_UNSAFE", view?.cct?.tick ?? -1, { openDebtAxes });
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}

