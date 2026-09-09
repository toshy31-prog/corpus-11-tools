import { createHash, createPrivateKey, sign } from "node:crypto";
import { adequacyReviewPayload } from "./runtime.mjs";
import * as v71 from "../sequenced-restoration-v7.1-observed-repair-completion/fixtures.mjs";
export * from "../sequenced-restoration-v7.1-observed-repair-completion/fixtures.mjs";
const KEYS = [
  { id:"recipient", role:"recipient-delegate", controller:"beneficiary-council", domain:"beneficiary-domain", pub:"MCowBQYDK2VwAyEAkS+LdpiFfjRjUk7O3FL1gdA1/LH3kdoxXdouR7VRaqo=", priv:"MC4CAQAwBQYDK2VwBCIEIHA9ispJVvxxgvXMaArfKNJJ9XJVR6LhtI4TSCrkeTlv" },
  { id:"peer", role:"independent-reviewer", controller:"repair-peer-review", domain:"peer-domain", pub:"MCowBQYDK2VwAyEAtVZgYRse2zR+zukFlqKaYo8JS2U/DvWMBXCpbieoBjo=", priv:"MC4CAQAwBQYDK2VwBCIEIM6BTSBZzHsd5zh6pDIbbV30BigQF28tLxVQG+0wU4Mf" },
  { id:"ombuds", role:"independent-reviewer", controller:"repair-ombuds", domain:"ombuds-domain", pub:"MCowBQYDK2VwAyEAat3Xz58mCYJbC5Dn3tuP7DGRTdKtC7YuErOZmxsfbEg=", priv:"MC4CAQAwBQYDK2VwBCIEICbdveoJaybqs4/G/yHizenr2055iBbdFXELcwohAeMc" }
];
export function adequacyReviewerRegistry() { return KEYS.map((k) => ({ reviewerId:k.id, role:k.role, controller:k.controller, failureDomain:k.domain, publicKeyDer:k.pub })); }
export function repairLossLedger(decision, repairExecutionDigest="12".repeat(32), axesPatch) { return { schema:"cct-repair-loss-ledger/v1", observerId:decision.observerId,
  incidentDigest:decision.incidentDigest, repairExecutionDigest, axes:axesPatch ?? [
    { axis:"access", baselineLoss:100, restoredCapacity:80, compensationValue:20, remainingLoss:0, recipientAcknowledgedRemainder:false, recourseOpen:true },
    { axis:"delay", baselineLoss:30, restoredCapacity:0, compensationValue:20, remainingLoss:10, recipientAcknowledgedRemainder:true, recourseOpen:true }
  ] }; }
export function adequacyReviews(decision, ledger, patch={}) { const ledgerDigest=createHash("sha256").update(JSON.stringify(ledger)).digest("hex"); return KEYS.slice(0,2).map((k) => {
  const item={ schema:"cct-repair-adequacy-review/v1", reviewerId:k.id, role:k.role, controller:k.controller, failureDomain:k.domain, publicKeyDer:k.pub,
    observerId:decision.observerId, incidentDigest:decision.incidentDigest, repairExecutionDigest:ledger.repairExecutionDigest, lossLedgerDigest:ledgerDigest,
    verdict:"sufficient", reviewedAtTick:decision.restoreAtTick+2, signature:"", ...patch };
  item.signature=sign(null,Buffer.from(adequacyReviewPayload(item)),createPrivateKey({key:Buffer.from(k.priv,"base64"),format:"der",type:"pkcs8"})).toString("base64"); return item; }); }
export function fullSetup() { const validation=v71.validValidation(), memory=v71.initialCheckpointMemory(validation), transition=v71.transitionFixture(memory,true), selectors=v71.selectorRegistry(), suspension=v71.suspensionFixture(transition,validation), decision=v71.repairDecision(suspension), ledger=repairLossLedger(decision); return { openDebtAxes:v71.axes, dependencyAudit:v71.audit, currentExercise:v71.completeExercise(), amendment:v71.validAmendment(), validation, memory, transition, selectors, admissionEndorsements:v71.validEndorsements(transition), suspension, suspensionEndorsements:v71.suspensionEndorsements(suspension,selectors), priorIncidentDigests:[], adjudicators:v71.adjudicatorRegistry(), decision, votes:v71.adjudicationVotes(decision), repairAttestors:v71.repairAttestorRegistry(), repairObservations:v71.repairObservations(decision), repairLossLedger:ledger, adequacyReviewers:adequacyReviewerRegistry(), adequacyReviews:adequacyReviews(decision,ledger) }; }
