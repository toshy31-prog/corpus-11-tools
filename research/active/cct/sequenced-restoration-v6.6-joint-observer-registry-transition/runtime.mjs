import { readFileSync } from "node:fs";
import { assessIntersectingObserverQuorum, CctIntersectingObserverQuorumRuntime } from "../sequenced-restoration-v6.5-intersecting-observer-quorum/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function assessJointObserverRegistryTransition(openDebtAxes, dependencyAudit, currentExercise, amendment,
  validation, memory, oldStatements, oldRegistry, newStatements, newRegistry) {
  const args = [openDebtAxes, dependencyAudit, currentExercise, amendment, validation, memory];
  const oldResult = assessIntersectingObserverQuorum(...args, oldStatements, oldRegistry);
  if (oldResult.status !== "intersecting_observer_quorum_candidate") return oldResult;
  const newResult = assessIntersectingObserverQuorum(...args, newStatements, newRegistry);
  if (newResult.status !== "intersecting_observer_quorum_candidate")
    return { status: "not_established", failures: ["new_observer_registry_quorum_invalid"] };
  const oldSigners = new Set(oldStatements.map((item) => item.observerId));
  const sharedSigners = newStatements.filter((item) => oldSigners.has(item.observerId)).map((item) => item.observerId);
  if (new Set(sharedSigners).size < SPEC.minimumSharedSigners)
    return { status: "not_established", failures: ["joint_registry_signer_intersection_insufficient"] };
  return { status: SPEC.successStatus, oldQuorum: oldStatements.length, newQuorum: newStatements.length,
    sharedSigners: [...new Set(sharedSigners)].sort(), failures: [] };
}

export class CctJointObserverRegistryTransitionRuntime extends CctIntersectingObserverQuorumRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const axes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = allowedActions.find((action) => {
      const packet = view?.cct?.generalLogConsistencyExercises?.[action]; const transition = view?.cct?.observerRegistryTransitions?.[action];
      return assessJointObserverRegistryTransition(axes, view?.cct?.dependencyAudits?.[action], packet?.currentExercise,
        packet?.amendment, packet?.validation, view?.cct?.checkpointMemories?.[action], transition?.oldStatements,
        transition?.oldRegistry, transition?.newStatements, transition?.newRegistry).status === SPEC.successStatus;
    });
    if (!selected) this.terminal("CCT_JOINT_OBSERVER_REGISTRY_TRANSITION_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
