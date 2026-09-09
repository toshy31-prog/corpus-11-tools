import { readFileSync } from "node:fs";
import {
  CctSingleFailureBridgeRuntime,
  selectSingleFailureTolerantBridge
} from "../sequenced-restoration-v2.0-single-failure/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function validateTemporalFailoverSpec(spec = SPEC) {
  return spec?.schema === "cct-bridge-temporal-failover/v1"
    && spec?.version === "2.1-candidate"
    && spec?.parentCandidate === "CCT-EXEC-2.0-SINGLE-FAILURE-CANDIDATE-001";
}

export function assessTemporalFailover(semantics, openDebtAxes, exercise) {
  const lanes = semantics?.continuityLanes;
  const windowTicks = exercise?.windowTicks;
  const trials = exercise?.trials;
  const failures = [];

  if (!Array.isArray(lanes) || lanes.length < 2) {
    return { status: "unestablished", failures: ["insufficient_lanes"] };
  }
  if (!Number.isInteger(windowTicks) || windowTicks < 0 || !Array.isArray(trials)) {
    return { status: "unestablished", failures: ["invalid_exercise"] };
  }

  for (let failedLane = 0; failedLane < lanes.length; failedLane += 1) {
    const trial = trials.find((candidate) => candidate?.failedLane === failedLane);
    if (!trial || !Array.isArray(trial.observations)) {
      failures.push({ failedLane, reason: "missing_trial" });
      continue;
    }
    const byTick = new Map(trial.observations.map((observation) => [observation?.tick, observation]));
    for (let tick = 0; tick <= windowTicks; tick += 1) {
      const observation = byTick.get(tick);
      if (!observation) {
        failures.push({ failedLane, tick, reason: "window_incomplete" });
        continue;
      }
      const activeLanes = Array.isArray(observation.activeLanes) ? observation.activeLanes : [];
      if (activeLanes.length === 0) {
        failures.push({ failedLane, tick, reason: "no_active_lane" });
      }
      if (activeLanes.includes(failedLane)) {
        failures.push({ failedLane, tick, reason: "perturbation_not_applied" });
      }
      const invalidActiveLane = activeLanes.find((lane) => !Number.isInteger(lane) || lane < 0 || lane >= lanes.length);
      if (invalidActiveLane !== undefined) {
        failures.push({ failedLane, tick, reason: "invalid_active_lane", lane: invalidActiveLane });
      }
      const supportedAxes = new Set(activeLanes.flatMap((lane) => lanes[lane]?.protectsAxes ?? []));
      const unsupportedAxes = openDebtAxes.filter((axis) => !supportedAxes.has(axis));
      if (unsupportedAxes.length > 0) {
        failures.push({ failedLane, tick, reason: "unsupported_protection", missingAxes: unsupportedAxes });
      }
      const protectedAxes = new Set(Array.isArray(observation.protectedAxes) ? observation.protectedAxes : []);
      const missingAxes = openDebtAxes.filter((axis) => !protectedAxes.has(axis));
      if (missingAxes.length > 0) {
        failures.push({ failedLane, tick, reason: "temporal_gap", missingAxes });
      }
    }
  }

  return {
    status: failures.length === 0 ? "observed_continuity_candidate" : "unestablished",
    failures
  };
}

export function selectTemporallyVerifiedBridge(
  actionOntology,
  allowedActions,
  openDebtAxes,
  bridgeExercises,
  failoverExercises
) {
  const temporallyQualified = allowedActions.filter((action) =>
    assessTemporalFailover(actionOntology?.[action], openDebtAxes, failoverExercises?.[action]).status
      === "observed_continuity_candidate"
  );
  return selectSingleFailureTolerantBridge(
    actionOntology,
    temporallyQualified,
    openDebtAxes,
    bridgeExercises
  );
}

export class CctTemporalFailoverRuntime extends CctSingleFailureBridgeRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase === "staged_restoration_receipt_pending") {
      const openDebtAxes = this.state.debts
        .filter((debt) => debt.status === "open")
        .map((debt) => debt.axis);
      const action = selectTemporallyVerifiedBridge(
        view?.cct?.actionOntology,
        allowedActions,
        openDebtAxes,
        view?.cct?.bridgeExercises,
        view?.cct?.failoverExercises
      );
      if (!action) this.terminal(
        "CCT_EVIDENCE_BRIDGE_TEMPORAL_FAILOVER_UNESTABLISHED",
        view?.cct?.tick ?? -1,
        { openDebtAxes }
      );
      return super.decide({ view, allowedActions: [action], history, predictionKeys });
    }
    return super.decide({ view, allowedActions, history, predictionKeys });
  }
}
