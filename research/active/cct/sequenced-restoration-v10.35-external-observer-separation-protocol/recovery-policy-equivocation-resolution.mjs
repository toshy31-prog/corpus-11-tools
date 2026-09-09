import { createHash, createPublicKey, verify } from "node:crypto";
import { detectRecoveryPolicyEquivocation } from "./recovery-policy-equivocation.mjs";
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const body = value => ({ schema: value.schema, previousPolicyDigest: value.previousPolicyDigest, resolvedTransitionDigests: value.resolvedTransitionDigests, selectedTransitionDigest: value.selectedTransitionDigest, selectedNextPolicyDigest: value.selectedNextPolicyDigest, effectiveAfterStatusGeneration: value.effectiveAfterStatusGeneration, recoverySignerIds: value.recoverySignerIds, ratifierIds: value.ratifierIds });
export const verifyRecoveryPolicyEquivocationResolution = (resolution, conflict, previousPolicy, currentStatus) => {
  const detected = detectRecoveryPolicyEquivocation(conflict.left, conflict.leftNextPolicy, conflict.right, conflict.rightNextPolicy, previousPolicy);
  const known = [...(currentStatus?.knownRecoveryPolicyEquivocationDigests ?? [])].sort(), resolved = [...(resolution?.resolvedTransitionDigests ?? [])].sort();
  const choices = [[detected.leftTransitionDigest, conflict.leftNextPolicy], [detected.rightTransitionDigest, conflict.rightNextPolicy]];
  const choice = choices.find(([transitionDigest]) => transitionDigest === resolution?.selectedTransitionDigest);
  const payload = Buffer.from(JSON.stringify(body(resolution ?? {})));
  const signers = (resolution?.recoverySignerIds ?? []).map(id => previousPolicy.members?.find(value => value.id === id && value.id !== conflict.left.replacedId));
  const ratifiers = (resolution?.ratifierIds ?? []).map(id => previousPolicy.ratifiers?.find(value => value.id === id));
  const selectedMember = choice?.[1].members?.find(value => value.id === conflict.left.replacedId);
  const checks = {
    conflictEstablished: detected.equivocation,
    completeIncidentSet: JSON.stringify(known) === JSON.stringify(resolved) && resolved.includes(detected.leftTransitionDigest) && resolved.includes(detected.rightTransitionDigest),
    selectionBound: resolution?.schema === "cct-recovery-policy-equivocation-resolution/v1" && resolution.previousPolicyDigest === conflict.left.previousPolicyDigest && choice && resolution.selectedNextPolicyDigest === digest(`${JSON.stringify(choice[1])}\n`) && Number.isSafeInteger(resolution.effectiveAfterStatusGeneration) && resolution.effectiveAfterStatusGeneration >= currentStatus.generation,
    unaffectedQuorum: new Set(resolution?.recoverySignerIds ?? []).size === signers.length && signers.length >= previousPolicy.threshold && signers.every(Boolean) && signers.every((value, index) => verify(null, payload, createPublicKey(value.publicKeyPem), Buffer.from(resolution.recoverySignaturesBase64?.[index] ?? "", "base64"))),
    ratification: new Set(resolution?.ratifierIds ?? []).size === ratifiers.length && ratifiers.length === previousPolicy.ratifiers?.length && ratifiers.every(Boolean) && ratifiers.every((value, index) => verify(null, payload, createPublicKey(value.publicKeyPem), Buffer.from(resolution.ratifierSignaturesBase64?.[index] ?? "", "base64"))),
    selectedMemberPossession: Boolean(selectedMember) && verify(null, payload, createPublicKey(selectedMember.publicKeyPem), Buffer.from(resolution.selectedMemberSignatureBase64 ?? "", "base64"))
  };
  return { ok: Object.values(checks).every(Boolean), checks, selectedNextPolicy: choice?.[1] ?? null };
};
