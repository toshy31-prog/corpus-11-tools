import { createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { observerCheckpointPayload } from "../sequenced-restoration-v6.4-cross-observer-checkpoint-agreement/runtime.mjs";
import { assessContestableObserverAdmission, CctContestableObserverAdmissionRuntime } from "../sequenced-restoration-v6.7-contestable-observer-admission/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
function signatureValid(item) {
  try { const key = createPublicKey({ key: Buffer.from(item.publicKeyDer, "base64"), format: "der", type: "spki" });
    return verify(null, Buffer.from(observerCheckpointPayload(item)), key, Buffer.from(item.signature, "base64")); } catch { return false; }
}
export function verifyObserverEquivocation(evidence, registry) {
  if (!Array.isArray(evidence) || evidence.length !== 2 || !Array.isArray(registry)) return false;
  const [a, b] = evidence; const member = registry.find((item) => item.observerId === a?.observerId);
  return Boolean(member && a.schema === "cct-observer-checkpoint/v1" && b.schema === a.schema
    && a.observerId === b.observerId && a.publicKeyDer === b.publicKeyDer && a.publicKeyDer === member.publicKeyDer
    && a.controller === b.controller && a.controller === member.controller
    && a.failureDomain === b.failureDomain && a.failureDomain === member.failureDomain
    && a.logId === b.logId && a.treeSize === b.treeSize && a.observedAtTick === b.observedAtTick
    && a.rootHash !== b.rootHash && signatureValid(a) && signatureValid(b));
}
export function assessEquivocationBoundedRevocation(openDebtAxes, dependencyAudit, currentExercise, amendment, validation,
  memory, transition, selectors, endorsements, evidence) {
  const prior = assessContestableObserverAdmission(openDebtAxes, dependencyAudit, currentExercise, amendment, validation,
    memory, transition, selectors, endorsements);
  if (prior.status !== "contestable_observer_admission_candidate") return prior;
  if (!verifyObserverEquivocation(evidence, transition.newRegistry))
    return { status: "not_established", failures: ["observer_equivocation_not_proven"] };
  return { status: SPEC.successStatus, revocableObserverId: evidence[0].observerId,
    faultEvidence: SPEC.revocableFault, failures: [] };
}

export class CctEquivocationBoundedRevocationRuntime extends CctContestableObserverAdmissionRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const axes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = allowedActions.find((action) => { const packet = view?.cct?.generalLogConsistencyExercises?.[action];
      return assessEquivocationBoundedRevocation(axes, view?.cct?.dependencyAudits?.[action], packet?.currentExercise,
        packet?.amendment, packet?.validation, view?.cct?.checkpointMemories?.[action],
        view?.cct?.observerRegistryTransitions?.[action], view?.cct?.observerSelectorRegistries?.[action],
        view?.cct?.observerAdmissionEndorsements?.[action], view?.cct?.observerEquivocationEvidence?.[action]).status === SPEC.successStatus; });
    if (!selected) this.terminal("CCT_OBSERVER_EQUIVOCATION_UNPROVEN", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
