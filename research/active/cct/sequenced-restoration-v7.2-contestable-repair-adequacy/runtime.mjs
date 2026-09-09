import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { assessObservedRepairCompletion, CctObservedRepairCompletionRuntime } from "../sequenced-restoration-v7.1-observed-repair-completion/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
const digest = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function adequacyReviewPayload(item) {
  return [item.schema, item.reviewerId, item.controller, item.failureDomain, item.role,
    item.observerId, item.incidentDigest, item.repairExecutionDigest, item.lossLedgerDigest,
    item.verdict, item.reviewedAtTick].join("\n");
}
function validLedger(ledger, prior) {
  if (ledger?.schema !== "cct-repair-loss-ledger/v1" || ledger.observerId !== prior.observerId
    || ledger.incidentDigest !== prior.incidentDigest || ledger.repairExecutionDigest !== prior.repairExecutionDigest
    || !Array.isArray(ledger.axes) || ledger.axes.length === 0) return false;
  const names = new Set();
  return ledger.axes.every((axis) => {
    const values = [axis.baselineLoss, axis.restoredCapacity, axis.compensationValue, axis.remainingLoss];
    if (typeof axis.axis !== "string" || !axis.axis || names.has(axis.axis)
      || values.some((v) => !Number.isSafeInteger(v) || v < 0)
      || axis.restoredCapacity + axis.compensationValue + axis.remainingLoss !== axis.baselineLoss
      || (axis.remainingLoss > 0 && !(axis.recipientAcknowledgedRemainder === true && axis.recourseOpen === true))) return false;
    names.add(axis.axis); return true;
  });
}
function validReview(item, reviewer, prior, ledgerDigest) {
  if (item?.schema !== "cct-repair-adequacy-review/v1" || !reviewer
    || item.reviewerId !== reviewer.reviewerId || item.publicKeyDer !== reviewer.publicKeyDer
    || item.controller !== reviewer.controller || item.failureDomain !== reviewer.failureDomain || item.role !== reviewer.role
    || item.observerId !== prior.observerId || item.incidentDigest !== prior.incidentDigest
    || item.repairExecutionDigest !== prior.repairExecutionDigest || item.lossLedgerDigest !== ledgerDigest
    || item.verdict !== "sufficient" || !Number.isSafeInteger(item.reviewedAtTick)) return false;
  try { const key = createPublicKey({ key: Buffer.from(item.publicKeyDer, "base64"), format: "der", type: "spki" });
    return verify(null, Buffer.from(adequacyReviewPayload(item)), key, Buffer.from(item.signature, "base64")); } catch { return false; }
}
export function assessContestableRepairAdequacy(args) {
  const prior = assessObservedRepairCompletion(args);
  if (prior.status !== "observed_repair_completion_candidate") return prior;
  if (!prior.repairApplicable) return { status: SPEC.successStatus, repairApplicable: false, failures: [] };
  const { decision, repairLossLedger: ledger, adequacyReviewers: reviewers, adequacyReviews: reviews } = args;
  if (!validLedger(ledger, { ...prior, observerId: decision.observerId, incidentDigest: decision.incidentDigest }))
    return { status: "not_established", failures: ["repair_loss_ledger_invalid_or_unclosed"] };
  if (!Array.isArray(reviewers) || reviewers.length !== SPEC.reviewerRegistrySize
    || !Array.isArray(reviews) || reviews.length < SPEC.reviewerQuorumSize)
    return { status: "not_established", failures: ["repair_adequacy_review_quorum_missing"] };
  const map = new Map(reviewers.map((r) => [r.reviewerId, r])), ledgerDigest = digest(ledger);
  const forbidden = new Set([...(args.transition?.newRegistry ?? []), ...(args.selectors ?? []), ...(args.adjudicators ?? []), ...(args.repairAttestors ?? [])].map((x) => x.controller));
  if (map.size !== reviewers.length || new Set(reviews.map((r) => r.reviewerId)).size !== reviews.length
    || !reviews.every((r) => validReview(r, map.get(r.reviewerId), { ...prior, observerId: decision.observerId, incidentDigest: decision.incidentDigest }, ledgerDigest))
    || new Set(reviews.map((r) => r.controller)).size < SPEC.reviewerQuorumSize
    || new Set(reviews.map((r) => r.failureDomain)).size < SPEC.reviewerQuorumSize
    || !reviews.some((r) => r.role === "recipient-delegate") || reviews.some((r) => forbidden.has(r.controller)))
    return { status: "not_established", failures: ["repair_adequacy_review_invalid_or_nonindependent"] };
  return { status: SPEC.successStatus, repairApplicable: true, lossLedgerDigest: ledgerDigest,
    recipientContestabilityPresent: true, evidenceLevel: "signed_synthetic_adequacy_reviews", failures: [] };
}

export class CctContestableRepairAdequacyRuntime extends CctObservedRepairCompletionRuntime {
  decide({ view, allowedActions, history = [], predictionKeys = [] }) {
    if (this.state.phase !== "staged_restoration_receipt_pending") return super.decide({ view, allowedActions, history, predictionKeys });
    const axes = this.state.debts.filter((d) => d.status === "open").map((d) => d.axis);
    const selected = allowedActions.find((action) => { const c = view?.cct, p = c?.generalLogConsistencyExercises?.[action];
      return assessContestableRepairAdequacy({ openDebtAxes: axes, dependencyAudit: c?.dependencyAudits?.[action], currentExercise: p?.currentExercise,
        amendment: p?.amendment, validation: p?.validation, memory: c?.checkpointMemories?.[action], transition: c?.observerRegistryTransitions?.[action],
        selectors: c?.observerSelectorRegistries?.[action], admissionEndorsements: c?.observerAdmissionEndorsements?.[action], suspension: c?.observerSuspensions?.[action],
        suspensionEndorsements: c?.observerSuspensionEndorsements?.[action], priorIncidentDigests: c?.priorSuspensionIncidentDigests?.[action],
        adjudicators: c?.suspensionAdjudicatorRegistries?.[action], decision: c?.suspensionAdjudications?.[action], votes: c?.suspensionAdjudicationVotes?.[action],
        repairAttestors: c?.repairAttestorRegistries?.[action], repairObservations: c?.repairObservations?.[action], repairLossLedger: c?.repairLossLedgers?.[action],
        adequacyReviewers: c?.repairAdequacyReviewerRegistries?.[action], adequacyReviews: c?.repairAdequacyReviews?.[action] }).status === SPEC.successStatus; });
    if (!selected) this.terminal("CCT_REPAIR_ADEQUACY_UNESTABLISHED", view?.cct?.tick ?? -1);
    return super.decide({ view, allowedActions: [selected], history, predictionKeys });
  }
}
