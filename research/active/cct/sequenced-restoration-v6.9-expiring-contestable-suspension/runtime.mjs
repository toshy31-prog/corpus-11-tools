import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { assessContestableObserverAdmission, CctContestableObserverAdmissionRuntime, registryDigest } from "../sequenced-restoration-v6.7-contestable-observer-admission/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
export function suspensionPayload(item) {
  return [item.schema, item.selectorId, item.controller, item.failureDomain, item.observerId,
    item.registryDigest, item.incidentDigest, item.groundsCode, item.openedAtTick, item.endsAtTick,
    item.appealRoute, item.evidenceRoute].join("\n");
}
function validEndorsement(item, selector, suspension, decisionTick) {
  if (item?.schema !== "cct-observer-suspension-endorsement/v1" || !selector
    || item.selectorId !== selector.selectorId || item.publicKeyDer !== selector.publicKeyDer
    || item.controller !== selector.controller || item.failureDomain !== selector.failureDomain
    || item.observerId !== suspension.observerId || item.registryDigest !== suspension.registryDigest
    || item.incidentDigest !== suspension.incidentDigest || item.groundsCode !== suspension.groundsCode
    || item.openedAtTick !== suspension.openedAtTick || item.endsAtTick !== suspension.endsAtTick
    || item.appealRoute !== suspension.appealRoute || item.evidenceRoute !== suspension.evidenceRoute
    || item.openedAtTick > decisionTick || item.endsAtTick <= decisionTick) return false;
  try {
    const key = createPublicKey({ key: Buffer.from(item.publicKeyDer, "base64"), format: "der", type: "spki" });
    return verify(null, Buffer.from(suspensionPayload(item)), key, Buffer.from(item.signature, "base64"));
  } catch { return false; }
}
export function effectiveObserverRegistry(registry, suspension, tick) {
  if (!suspension || tick >= suspension.endsAtTick) return [...registry];
  return registry.filter((item) => item.observerId !== suspension.observerId);
}
export function assessExpiringContestableSuspension(openDebtAxes, dependencyAudit, currentExercise, amendment, validation,
  memory, transition, selectors, admissionEndorsements, suspension, suspensionEndorsements, priorIncidentDigests = []) {
  const prior = assessContestableObserverAdmission(openDebtAxes, dependencyAudit, currentExercise, amendment, validation,
    memory, transition, selectors, admissionEndorsements);
  if (prior.status !== "contestable_observer_admission_candidate") return prior;
  const tick = validation.generalLogConsistencyProof.integratedAtTick;
  const digest = registryDigest(transition.newRegistry);
  if (!suspension || suspension.schema !== "cct-observer-suspension/v1"
    || !transition.newRegistry.some((item) => item.observerId === suspension.observerId)
    || suspension.registryDigest !== digest || !/^[0-9a-f]{64}$/.test(suspension.incidentDigest ?? "")
    || !SPEC.allowedGrounds.includes(suspension.groundsCode)
    || suspension.openedAtTick !== tick || !Number.isInteger(suspension.endsAtTick)
    || suspension.endsAtTick <= tick || suspension.endsAtTick - tick > SPEC.maximumSuspensionTicks
    || typeof suspension.appealRoute !== "string" || suspension.appealRoute.length === 0
    || typeof suspension.evidenceRoute !== "string" || suspension.evidenceRoute.length === 0
    || priorIncidentDigests.includes(suspension.incidentDigest))
    return { status: "not_established", failures: ["bounded_suspension_invalid"] };
  if (!Array.isArray(suspensionEndorsements) || suspensionEndorsements.length < SPEC.selectorQuorumSize)
    return { status: "not_established", failures: ["suspension_selector_quorum_missing"] };
  const selectorMap = new Map(selectors.map((item) => [item.selectorId, item]));
  const observerControllers = new Set(transition.newRegistry.map((item) => item.controller));
  if (new Set(suspensionEndorsements.map((item) => item.selectorId)).size !== suspensionEndorsements.length
    || !suspensionEndorsements.every((item) => validEndorsement(item, selectorMap.get(item.selectorId), suspension, tick))
    || new Set(suspensionEndorsements.map((item) => item.controller)).size < SPEC.selectorQuorumSize
    || new Set(suspensionEndorsements.map((item) => item.failureDomain)).size < SPEC.selectorQuorumSize
    || suspensionEndorsements.some((item) => observerControllers.has(item.controller)))
    return { status: "not_established", failures: ["suspension_selector_independence_invalid"] };
  return { status: SPEC.successStatus, suspendedObserverId: suspension.observerId,
    incidentDigest: suspension.incidentDigest, endsAtTick: suspension.endsAtTick,
    registryDigest: digest, registryMutated: false, automaticReturn: true, failures: [] };
}

export class CctExpiringContestableSuspensionRuntime extends CctContestableObserverAdmissionRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const axes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = allowedActions.find((action) => { const packet = view?.cct?.generalLogConsistencyExercises?.[action];
      return assessExpiringContestableSuspension(axes, view?.cct?.dependencyAudits?.[action], packet?.currentExercise,
        packet?.amendment, packet?.validation, view?.cct?.checkpointMemories?.[action],
        view?.cct?.observerRegistryTransitions?.[action], view?.cct?.observerSelectorRegistries?.[action],
        view?.cct?.observerAdmissionEndorsements?.[action], view?.cct?.observerSuspensions?.[action],
        view?.cct?.observerSuspensionEndorsements?.[action], view?.cct?.priorSuspensionIncidentDigests?.[action]).status === SPEC.successStatus; });
    if (!selected) this.terminal("CCT_BOUNDED_OBSERVER_SUSPENSION_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
