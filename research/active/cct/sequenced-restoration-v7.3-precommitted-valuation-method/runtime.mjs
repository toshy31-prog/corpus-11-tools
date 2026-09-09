import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { assessContestableRepairAdequacy, CctContestableRepairAdequacyRuntime } from "../sequenced-restoration-v7.2-contestable-repair-adequacy/runtime.mjs";
const SPEC=JSON.parse(readFileSync(new URL("./spec.json",import.meta.url)));
const digest=(v)=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
export function valuationEndorsementPayload(x){return [x.schema,x.stewardId,x.controller,x.failureDomain,x.methodDigest,x.registeredAtTick].join("\n");}
function validMethod(method,ledger,suspension){
  if(method?.schema!=="cct-valuation-method/v1"||!Number.isSafeInteger(method.registeredAtTick)||method.registeredAtTick>=suspension.openedAtTick
    ||!Array.isArray(method.axes)||method.axes.length!==ledger.axes.length)return false;
  const byAxis=new Map(method.axes.map(x=>[x.axis,x]));
  if(byAxis.size!==method.axes.length)return false;
  return ledger.axes.every(loss=>{const m=byAxis.get(loss.axis);return m&&typeof m.unit==="string"&&m.unit.length>0
    &&/^[0-9a-f]{64}$/.test(m.referenceDigest??"")&&/^[0-9a-f]{64}$/.test(m.measurementProcessDigest??"")
    &&Number.isSafeInteger(m.toleranceBps)&&m.toleranceBps>=0&&m.toleranceBps<=SPEC.maximumToleranceBps
    &&Number.isSafeInteger(m.sensitivityLow)&&Number.isSafeInteger(m.sensitivityHigh)&&m.sensitivityLow>=0
    &&m.sensitivityLow<=loss.baselineLoss&&loss.baselineLoss<=m.sensitivityHigh;});
}
function validEndorsement(x,steward,method){if(x?.schema!=="cct-valuation-method-endorsement/v1"||!steward||x.stewardId!==steward.stewardId
  ||x.publicKeyDer!==steward.publicKeyDer||x.controller!==steward.controller||x.failureDomain!==steward.failureDomain
  ||x.methodDigest!==digest(method)||x.registeredAtTick!==method.registeredAtTick)return false;
  try{const key=createPublicKey({key:Buffer.from(x.publicKeyDer,"base64"),format:"der",type:"spki"});return verify(null,Buffer.from(valuationEndorsementPayload(x)),key,Buffer.from(x.signature,"base64"));}catch{return false;}}
export function assessPrecommittedValuationMethod(args){const prior=assessContestableRepairAdequacy(args);if(prior.status!=="contestable_repair_adequacy_candidate")return prior;
  if(!prior.repairApplicable)return{status:SPEC.successStatus,repairApplicable:false,failures:[]};
  const {valuationMethod:method,valuationStewards:stewards,valuationEndorsements:endorsements,repairLossLedger:ledger,suspension}=args;
  if(!validMethod(method,ledger,suspension))return{status:"not_established",failures:["valuation_method_late_incomplete_or_unbounded"]};
  if(!Array.isArray(stewards)||stewards.length!==SPEC.stewardRegistrySize||!Array.isArray(endorsements)||endorsements.length<SPEC.stewardQuorumSize)
    return{status:"not_established",failures:["valuation_method_endorsement_quorum_missing"]};
  const map=new Map(stewards.map(x=>[x.stewardId,x]));const forbidden=new Set([...(args.transition?.newRegistry??[]),...(args.selectors??[]),...(args.adjudicators??[]),...(args.repairAttestors??[]),...(args.adequacyReviewers??[])].map(x=>x.controller));
  if(map.size!==stewards.length||new Set(endorsements.map(x=>x.stewardId)).size!==endorsements.length||!endorsements.every(x=>validEndorsement(x,map.get(x.stewardId),method))
    ||new Set(endorsements.map(x=>x.controller)).size<SPEC.stewardQuorumSize||new Set(endorsements.map(x=>x.failureDomain)).size<SPEC.stewardQuorumSize||endorsements.some(x=>forbidden.has(x.controller)))
    return{status:"not_established",failures:["valuation_method_endorsement_invalid_or_nonindependent"]};
  return{status:SPEC.successStatus,repairApplicable:true,valuationMethodDigest:digest(method),precommittedAtTick:method.registeredAtTick,evidenceLevel:"signed_synthetic_valuation_precommitment",failures:[]};}
export class CctPrecommittedValuationMethodRuntime extends CctContestableRepairAdequacyRuntime{
  decide({view,allowedActions,history=[],predictionKeys=[]}){if(this.state.phase!=="staged_restoration_receipt_pending")return super.decide({view,allowedActions,history,predictionKeys});
    const axes=this.state.debts.filter(d=>d.status==="open").map(d=>d.axis);const selected=allowedActions.find(action=>{const c=view?.cct,p=c?.generalLogConsistencyExercises?.[action];return assessPrecommittedValuationMethod({openDebtAxes:axes,dependencyAudit:c?.dependencyAudits?.[action],currentExercise:p?.currentExercise,amendment:p?.amendment,validation:p?.validation,memory:c?.checkpointMemories?.[action],transition:c?.observerRegistryTransitions?.[action],selectors:c?.observerSelectorRegistries?.[action],admissionEndorsements:c?.observerAdmissionEndorsements?.[action],suspension:c?.observerSuspensions?.[action],suspensionEndorsements:c?.observerSuspensionEndorsements?.[action],priorIncidentDigests:c?.priorSuspensionIncidentDigests?.[action],adjudicators:c?.suspensionAdjudicatorRegistries?.[action],decision:c?.suspensionAdjudications?.[action],votes:c?.suspensionAdjudicationVotes?.[action],repairAttestors:c?.repairAttestorRegistries?.[action],repairObservations:c?.repairObservations?.[action],repairLossLedger:c?.repairLossLedgers?.[action],adequacyReviewers:c?.repairAdequacyReviewerRegistries?.[action],adequacyReviews:c?.repairAdequacyReviews?.[action],valuationMethod:c?.valuationMethods?.[action],valuationStewards:c?.valuationStewardRegistries?.[action],valuationEndorsements:c?.valuationMethodEndorsements?.[action]}).status===SPEC.successStatus;});
    if(!selected)this.terminal("CCT_VALUATION_METHOD_UNESTABLISHED",view?.cct?.tick??-1);return super.decide({view,allowedActions:[selected],history,predictionKeys});}}
