import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { assessJointObserverRegistryTransition, CctJointObserverRegistryTransitionRuntime } from "../sequenced-restoration-v6.6-joint-observer-registry-transition/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
export function registryDigest(registry) {
  const canonical = [...registry].sort((a, b) => a.observerId.localeCompare(b.observerId))
    .map(({ observerId, controller, failureDomain, publicKeyDer }) => ({ observerId, controller, failureDomain, publicKeyDer }));
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}
export function admissionPayload(item) {
  return [item.schema, item.selectorId, item.controller, item.failureDomain, item.registryDigest,
    item.approvedAtTick, item.mandateEndsAtTick, item.appealRoute].join("\n");
}
function validEndorsement(item, selector, digest, decisionTick) {
  if (item?.schema !== "cct-observer-admission-endorsement/v1" || !selector
    || item.selectorId !== selector.selectorId || item.publicKeyDer !== selector.publicKeyDer
    || item.controller !== selector.controller || item.failureDomain !== selector.failureDomain
    || item.registryDigest !== digest || !Number.isInteger(item.approvedAtTick) || item.approvedAtTick > decisionTick
    || !Number.isInteger(item.mandateEndsAtTick) || item.mandateEndsAtTick <= decisionTick
    || item.mandateEndsAtTick - item.approvedAtTick > SPEC.maximumMandateTicks
    || typeof item.appealRoute !== "string" || item.appealRoute.length === 0) return false;
  try { const key = createPublicKey({ key: Buffer.from(item.publicKeyDer, "base64"), format: "der", type: "spki" });
    return verify(null, Buffer.from(admissionPayload(item)), key, Buffer.from(item.signature, "base64")); } catch { return false; }
}
export function assessContestableObserverAdmission(openDebtAxes, dependencyAudit, currentExercise, amendment, validation,
  memory, transition, selectors, endorsements) {
  const prior = assessJointObserverRegistryTransition(openDebtAxes, dependencyAudit, currentExercise, amendment, validation,
    memory, transition?.oldStatements, transition?.oldRegistry, transition?.newStatements, transition?.newRegistry);
  if (prior.status !== "joint_observer_registry_transition_candidate") return prior;
  if (!Array.isArray(selectors) || selectors.length !== SPEC.selectorRegistrySize || !Array.isArray(endorsements)
    || endorsements.length < SPEC.selectorQuorumSize)
    return { status: "not_established", failures: ["observer_admission_selector_quorum_missing"] };
  const selectorMap = new Map(selectors.map((item) => [item.selectorId, item]));
  const digest = registryDigest(transition.newRegistry); const decisionTick = validation.generalLogConsistencyProof.integratedAtTick;
  const observerControllers = new Set([...transition.oldRegistry, ...transition.newRegistry].map((item) => item.controller));
  if (selectorMap.size !== SPEC.selectorRegistrySize || new Set(endorsements.map((item) => item.selectorId)).size !== endorsements.length
    || !endorsements.every((item) => validEndorsement(item, selectorMap.get(item.selectorId), digest, decisionTick))
    || new Set(endorsements.map((item) => item.controller)).size < SPEC.selectorQuorumSize
    || new Set(endorsements.map((item) => item.failureDomain)).size < SPEC.selectorQuorumSize
    || endorsements.some((item) => observerControllers.has(item.controller)))
    return { status: "not_established", failures: ["observer_admission_independence_invalid"] };
  return { status: SPEC.successStatus, registryDigest: digest,
    mandateEndsAtTick: Math.min(...endorsements.map((item) => item.mandateEndsAtTick)), failures: [] };
}

export class CctContestableObserverAdmissionRuntime extends CctJointObserverRegistryTransitionRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const axes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = allowedActions.find((action) => { const packet = view?.cct?.generalLogConsistencyExercises?.[action];
      return assessContestableObserverAdmission(axes, view?.cct?.dependencyAudits?.[action], packet?.currentExercise,
        packet?.amendment, packet?.validation, view?.cct?.checkpointMemories?.[action],
        view?.cct?.observerRegistryTransitions?.[action], view?.cct?.observerSelectorRegistries?.[action],
        view?.cct?.observerAdmissionEndorsements?.[action]).status === SPEC.successStatus; });
    if (!selected) this.terminal("CCT_CONTESTABLE_OBSERVER_ADMISSION_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
