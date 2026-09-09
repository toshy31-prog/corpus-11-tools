import { readFileSync } from "node:fs";
import { assessCrossObserverCheckpointAgreement, CctCrossObserverCheckpointAgreementRuntime } from "../sequenced-restoration-v6.4-cross-observer-checkpoint-agreement/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function assessIntersectingObserverQuorum(openDebtAxes, dependencyAudit, currentExercise, amendment, validation,
  memory, statements, registry) {
  const prior = assessCrossObserverCheckpointAgreement(openDebtAxes, dependencyAudit, currentExercise, amendment,
    validation, memory, statements);
  if (prior.status !== "cross_observer_checkpoint_agreement_candidate") return prior;
  if (!Array.isArray(registry) || registry.length !== SPEC.registrySize || !Array.isArray(statements)
    || statements.length < SPEC.quorumSize)
    return { status: "not_established", failures: ["intersecting_observer_quorum_missing"] };
  const registered = new Map(registry.map((item) => [item.observerId, item]));
  if (registered.size !== SPEC.registrySize || new Set(statements.map((item) => item.observerId)).size !== statements.length
    || statements.some((item) => {
      const member = registered.get(item.observerId);
      return !member || member.publicKeyDer !== item.publicKeyDer || member.controller !== item.controller
        || member.failureDomain !== item.failureDomain;
    })) return { status: "not_established", failures: ["intersecting_observer_registry_invalid"] };
  return { status: SPEC.successStatus, quorumSize: statements.length,
    intersectionGuarantee: SPEC.quorumSize * 2 - SPEC.registrySize, failures: [] };
}

export class CctIntersectingObserverQuorumRuntime extends CctCrossObserverCheckpointAgreementRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const axes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = allowedActions.find((action) => {
      const packet = view?.cct?.generalLogConsistencyExercises?.[action];
      return assessIntersectingObserverQuorum(axes, view?.cct?.dependencyAudits?.[action], packet?.currentExercise,
        packet?.amendment, packet?.validation, view?.cct?.checkpointMemories?.[action],
        view?.cct?.observerCheckpointStatements?.[action], view?.cct?.observerRegistries?.[action]).status === SPEC.successStatus;
    });
    if (!selected) this.terminal("CCT_INTERSECTING_OBSERVER_QUORUM_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
