import { readFileSync } from "node:fs";
import {
  CctCommonCauseRuntime,
  selectCommonCauseQualifiedBridge
} from "../sequenced-restoration-v2.2-common-cause/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
export const REQUIRED_DEPENDENCY_CLASSES = Object.freeze([
  "control", "identity", "data", "network", "power",
  "finance", "personnel", "supplier", "geography"
]);

export function validateDependencyDetectabilitySpec(candidate = SPEC) {
  return candidate?.schema === "cct-dependency-detectability/v1"
    && candidate?.version === "2.3-candidate"
    && candidate?.parentCandidate === "CCT-EXEC-2.2-COMMON-CAUSE-CANDIDATE-001";
}

function independentChannels(channels) {
  return channels.length >= 2
    && new Set(channels.map((channel) => channel.controller)).size >= 2
    && new Set(channels.map((channel) => channel.failureDomain)).size >= 2;
}

export function assessDependencyDetectability(audit) {
  const channels = audit?.channels;
  const challenges = audit?.blindChallenges;
  const thresholds = audit?.materialityThresholds;
  const windowTicks = audit?.windowTicks;
  const failures = [];
  if (!Array.isArray(channels) || !Array.isArray(challenges)
    || !thresholds || !Number.isInteger(windowTicks) || windowTicks < 0) {
    return { status: "detectability_unknown", failures: ["invalid_audit"] };
  }

  for (const dependencyClass of REQUIRED_DEPENDENCY_CLASSES) {
    const materialityThreshold = thresholds[dependencyClass];
    if (typeof materialityThreshold !== "number" || !Number.isFinite(materialityThreshold) || materialityThreshold <= 0) {
      failures.push({ dependencyClass, reason: "materiality_threshold_missing" });
      continue;
    }
    const capableChannels = channels.filter((channel) =>
      typeof channel?.id === "string" && channel.id
      && Array.isArray(channel.dependencyClasses) && channel.dependencyClasses.includes(dependencyClass)
      && typeof channel.controller === "string" && channel.controller
      && typeof channel.failureDomain === "string" && channel.failureDomain
      && typeof channel.detectionThreshold === "number"
      && channel.detectionThreshold <= materialityThreshold
      && typeof channel.noiseCeiling === "number"
      && channel.noiseCeiling < materialityThreshold
    );
    if (!independentChannels(capableChannels)) {
      failures.push({ dependencyClass, reason: "independent_detection_channels_missing" });
      continue;
    }
    const capableIds = new Set(capableChannels.map((channel) => channel.id));
    const classChallenges = challenges.filter((challenge) =>
      challenge?.dependencyClass === dependencyClass
      && challenge.blind === true
      && challenge.impact === materialityThreshold
      && typeof challenge.sourceRoot === "string" && challenge.sourceRoot
    );
    if (classChallenges.length < 2 || new Set(classChallenges.map((challenge) => challenge.sourceRoot)).size < 2) {
      failures.push({ dependencyClass, reason: "independent_blind_challenges_missing" });
      continue;
    }
    for (const challenge of classChallenges) {
      const detectedBy = new Set(Array.isArray(challenge.detectedBy) ? challenge.detectedBy : []);
      const detectors = capableChannels.filter((channel) => detectedBy.has(channel.id));
      if (!independentChannels(detectors)
        || !Number.isInteger(challenge.detectionTick)
        || challenge.detectionTick < 0
        || challenge.detectionTick > windowTicks
        || [...detectedBy].some((id) => !capableIds.has(id))) {
        failures.push({ dependencyClass, challenge: challenge.id ?? null, reason: "blind_challenge_not_detected_in_window" });
      }
    }
  }
  return {
    status: failures.length === 0 ? "bounded_inventory_detection_candidate" : "detectability_unknown",
    failures
  };
}

export function selectDetectabilityQualifiedBridge(
  actionOntology,
  allowedActions,
  openDebtAxes,
  bridgeExercises,
  failoverExercises,
  commonCauseExercises,
  dependencyAudits
) {
  const qualified = allowedActions.filter((action) =>
    assessDependencyDetectability(dependencyAudits?.[action]).status
      === "bounded_inventory_detection_candidate"
  );
  return selectCommonCauseQualifiedBridge(
    actionOntology,
    qualified,
    openDebtAxes,
    bridgeExercises,
    failoverExercises,
    commonCauseExercises
  );
}

export class CctDependencyDetectabilityRuntime extends CctCommonCauseRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") {
      return super.decide({ view, allowedActions, history, predictionKeys });
    }
    const openDebtAxes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = selectDetectabilityQualifiedBridge(
      view?.cct?.actionOntology,
      allowedActions,
      openDebtAxes,
      view?.cct?.bridgeExercises,
      view?.cct?.failoverExercises,
      view?.cct?.commonCauseExercises,
      view?.cct?.dependencyAudits
    );
    if (!selected) this.terminal("CCT_DEPENDENCY_INVENTORY_DETECTABILITY_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}

