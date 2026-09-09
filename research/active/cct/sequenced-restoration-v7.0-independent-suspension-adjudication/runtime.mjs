import { createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { assessExpiringContestableSuspension, CctExpiringContestableSuspensionRuntime } from "../sequenced-restoration-v6.9-expiring-contestable-suspension/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
export function adjudicationPayload(item) {
  return [item.schema, item.adjudicatorId, item.controller, item.failureDomain, item.observerId,
    item.incidentDigest, item.recordDigest, item.finding, item.decidedAtTick, item.restoreAtTick,
    item.correctionRecord, item.repairReceipt, item.accountabilityReferral, item.appealRoute].join("\n");
}
function validVote(item, adjudicator, decision, suspension) {
  if (item?.schema !== "cct-suspension-adjudication-vote/v1" || !adjudicator
    || item.adjudicatorId !== adjudicator.adjudicatorId || item.publicKeyDer !== adjudicator.publicKeyDer
    || item.controller !== adjudicator.controller || item.failureDomain !== adjudicator.failureDomain
    || item.observerId !== suspension.observerId || item.incidentDigest !== suspension.incidentDigest
    || item.recordDigest !== decision.recordDigest || item.finding !== decision.finding
    || item.decidedAtTick !== decision.decidedAtTick || item.restoreAtTick !== decision.restoreAtTick
    || item.correctionRecord !== decision.correctionRecord || item.repairReceipt !== decision.repairReceipt
    || item.accountabilityReferral !== decision.accountabilityReferral || item.appealRoute !== decision.appealRoute) return false;
  try { const key = createPublicKey({ key: Buffer.from(item.publicKeyDer, "base64"), format: "der", type: "spki" });
    return verify(null, Buffer.from(adjudicationPayload(item)), key, Buffer.from(item.signature, "base64")); } catch { return false; }
}
export function assessIndependentSuspensionAdjudication(openDebtAxes, dependencyAudit, currentExercise, amendment,
  validation, memory, transition, selectors, admissionEndorsements, suspension, suspensionEndorsements,
  priorIncidentDigests, adjudicators, decision, votes) {
  const prior = assessExpiringContestableSuspension(openDebtAxes, dependencyAudit, currentExercise, amendment,
    validation, memory, transition, selectors, admissionEndorsements, suspension, suspensionEndorsements, priorIncidentDigests);
  if (prior.status !== "expiring_contestable_suspension_candidate") return prior;
  if (!decision || decision.schema !== "cct-suspension-adjudication/v1"
    || decision.observerId !== suspension.observerId || decision.incidentDigest !== suspension.incidentDigest
    || !/^[0-9a-f]{64}$/.test(decision.recordDigest ?? "") || !SPEC.allowedFindings.includes(decision.finding)
    || !Number.isInteger(decision.decidedAtTick) || decision.decidedAtTick < suspension.openedAtTick
    || decision.decidedAtTick >= suspension.endsAtTick || typeof decision.appealRoute !== "string" || !decision.appealRoute)
    return { status: "not_established", failures: ["suspension_adjudication_invalid"] };
  const restores = decision.finding !== "safeguard-substantiated";
  const abusive = decision.finding === "suspension-abusive";
  if ((restores && (decision.restoreAtTick !== decision.decidedAtTick || !decision.correctionRecord || !decision.repairReceipt))
    || (!restores && decision.restoreAtTick !== suspension.endsAtTick)
    || (abusive && !decision.accountabilityReferral)
    || (!abusive && decision.accountabilityReferral))
    return { status: "not_established", failures: ["finding_consequence_mismatch"] };
  if (!Array.isArray(adjudicators) || adjudicators.length !== SPEC.adjudicatorRegistrySize
    || !Array.isArray(votes) || votes.length < SPEC.adjudicatorQuorumSize)
    return { status: "not_established", failures: ["adjudicator_quorum_missing"] };
  const map = new Map(adjudicators.map((item) => [item.adjudicatorId, item]));
  const forbiddenControllers = new Set([...transition.newRegistry, ...selectors].map((item) => item.controller));
  if (map.size !== adjudicators.length || new Set(votes.map((item) => item.adjudicatorId)).size !== votes.length
    || !votes.every((item) => validVote(item, map.get(item.adjudicatorId), decision, suspension))
    || new Set(votes.map((item) => item.controller)).size < SPEC.adjudicatorQuorumSize
    || new Set(votes.map((item) => item.failureDomain)).size < SPEC.adjudicatorQuorumSize
    || votes.some((item) => forbiddenControllers.has(item.controller)))
    return { status: "not_established", failures: ["adjudicator_independence_invalid"] };
  return { status: SPEC.successStatus, finding: decision.finding, restoreAtTick: decision.restoreAtTick,
    correctionRequired: restores, repairRequired: restores, selectorAccountabilityRequired: abusive,
    automaticRevocation: false, failures: [] };
}

export class CctIndependentSuspensionAdjudicationRuntime extends CctExpiringContestableSuspensionRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const axes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = allowedActions.find((action) => { const p = view?.cct?.generalLogConsistencyExercises?.[action];
      return assessIndependentSuspensionAdjudication(axes, view?.cct?.dependencyAudits?.[action], p?.currentExercise,
        p?.amendment, p?.validation, view?.cct?.checkpointMemories?.[action], view?.cct?.observerRegistryTransitions?.[action],
        view?.cct?.observerSelectorRegistries?.[action], view?.cct?.observerAdmissionEndorsements?.[action],
        view?.cct?.observerSuspensions?.[action], view?.cct?.observerSuspensionEndorsements?.[action],
        view?.cct?.priorSuspensionIncidentDigests?.[action], view?.cct?.suspensionAdjudicatorRegistries?.[action],
        view?.cct?.suspensionAdjudications?.[action], view?.cct?.suspensionAdjudicationVotes?.[action]).status === SPEC.successStatus; });
    if (!selected) this.terminal("CCT_INDEPENDENT_SUSPENSION_ADJUDICATION_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
