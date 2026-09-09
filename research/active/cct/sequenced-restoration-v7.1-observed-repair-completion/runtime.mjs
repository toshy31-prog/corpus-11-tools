import { createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { assessIndependentSuspensionAdjudication, CctIndependentSuspensionAdjudicationRuntime } from "../sequenced-restoration-v7.0-independent-suspension-adjudication/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
export function repairObservationPayload(item) {
  return [item.schema, item.attestorId, item.controller, item.failureDomain, item.channel,
    item.observerId, item.incidentDigest, item.repairCommitmentDigest, item.repairExecutionDigest,
    item.observedAtTick, item.eligibilityRestored, item.correctionPublished, item.compensationTransferred].join("\n");
}
function validObservation(item, attestor, decision) {
  if (item?.schema !== "cct-repair-observation/v1" || !attestor
    || item.attestorId !== attestor.attestorId || item.publicKeyDer !== attestor.publicKeyDer
    || item.controller !== attestor.controller || item.failureDomain !== attestor.failureDomain
    || item.channel !== attestor.channel || item.observerId !== decision.observerId
    || item.incidentDigest !== decision.incidentDigest || item.repairCommitmentDigest !== decision.repairReceipt
    || !/^[0-9a-f]{64}$/.test(item.repairExecutionDigest ?? "") || item.observedAtTick < decision.restoreAtTick
    || item.eligibilityRestored !== true || item.correctionPublished !== true || item.compensationTransferred !== true) return false;
  try { const key = createPublicKey({ key: Buffer.from(item.publicKeyDer, "base64"), format: "der", type: "spki" });
    return verify(null, Buffer.from(repairObservationPayload(item)), key, Buffer.from(item.signature, "base64")); } catch { return false; }
}
export function assessObservedRepairCompletion(args) {
  const { openDebtAxes, dependencyAudit, currentExercise, amendment, validation, memory, transition, selectors,
    admissionEndorsements, suspension, suspensionEndorsements, priorIncidentDigests, adjudicators, decision, votes,
    repairAttestors, repairObservations } = args;
  const prior = assessIndependentSuspensionAdjudication(openDebtAxes, dependencyAudit, currentExercise, amendment,
    validation, memory, transition, selectors, admissionEndorsements, suspension, suspensionEndorsements,
    priorIncidentDigests, adjudicators, decision, votes);
  if (prior.status !== "independent_suspension_adjudication_candidate") return prior;
  if (!prior.repairRequired) return { status: SPEC.successStatus, repairApplicable: false, failures: [] };
  if (!/^[0-9a-f]{64}$/.test(decision.repairReceipt ?? ""))
    return { status: "not_established", failures: ["repair_commitment_not_content_addressed"] };
  if (!Array.isArray(repairAttestors) || repairAttestors.length !== SPEC.attestorRegistrySize
    || !Array.isArray(repairObservations) || repairObservations.length < SPEC.attestorQuorumSize)
    return { status: "not_established", failures: ["repair_observation_quorum_missing"] };
  const map = new Map(repairAttestors.map((item) => [item.attestorId, item]));
  const forbidden = new Set([...transition.newRegistry, ...selectors, ...adjudicators].map((item) => item.controller));
  const executionDigests = new Set(repairObservations.map((item) => item.repairExecutionDigest));
  if (map.size !== repairAttestors.length || new Set(repairObservations.map((item) => item.attestorId)).size !== repairObservations.length
    || !repairObservations.every((item) => validObservation(item, map.get(item.attestorId), decision))
    || new Set(repairObservations.map((item) => item.controller)).size < SPEC.attestorQuorumSize
    || new Set(repairObservations.map((item) => item.failureDomain)).size < SPEC.attestorQuorumSize
    || new Set(repairObservations.map((item) => item.channel)).size < SPEC.requiredDistinctChannels
    || executionDigests.size !== 1 || repairObservations.some((item) => forbidden.has(item.controller)))
    return { status: "not_established", failures: ["repair_observation_independence_or_agreement_invalid"] };
  return { status: SPEC.successStatus, repairApplicable: true, repairExecutionDigest: [...executionDigests][0],
    eligibilityRestored: true, correctionPublished: true, compensationTransferred: true,
    evidenceLevel: "signed_synthetic_observations", failures: [] };
}

export class CctObservedRepairCompletionRuntime extends CctIndependentSuspensionAdjudicationRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const axes = this.state.debts.filter((debt) => debt.status === "open").map((debt) => debt.axis);
    const selected = allowedActions.find((action) => { const c = view?.cct, p = c?.generalLogConsistencyExercises?.[action];
      return assessObservedRepairCompletion({ openDebtAxes: axes, dependencyAudit: c?.dependencyAudits?.[action],
        currentExercise: p?.currentExercise, amendment: p?.amendment, validation: p?.validation,
        memory: c?.checkpointMemories?.[action], transition: c?.observerRegistryTransitions?.[action],
        selectors: c?.observerSelectorRegistries?.[action], admissionEndorsements: c?.observerAdmissionEndorsements?.[action],
        suspension: c?.observerSuspensions?.[action], suspensionEndorsements: c?.observerSuspensionEndorsements?.[action],
        priorIncidentDigests: c?.priorSuspensionIncidentDigests?.[action], adjudicators: c?.suspensionAdjudicatorRegistries?.[action],
        decision: c?.suspensionAdjudications?.[action], votes: c?.suspensionAdjudicationVotes?.[action],
        repairAttestors: c?.repairAttestorRegistries?.[action], repairObservations: c?.repairObservations?.[action] }).status === SPEC.successStatus; });
    if (!selected) this.terminal("CCT_OBSERVED_REPAIR_COMPLETION_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
