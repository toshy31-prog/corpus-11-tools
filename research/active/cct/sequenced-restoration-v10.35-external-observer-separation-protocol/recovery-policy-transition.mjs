import { createHash, createPublicKey, verify } from "node:crypto";
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const body = value => ({ schema: value.schema, previousPolicyDigest: value.previousPolicyDigest, nextPolicyDigest: value.nextPolicyDigest, replacedId: value.replacedId, previousKeyDigest: value.previousKeyDigest, nextKeyDigest: value.nextKeyDigest, effectiveAfterStatusGeneration: value.effectiveAfterStatusGeneration, compromiseEvidenceDigest: value.compromiseEvidenceDigest, recoverySignerIds: value.recoverySignerIds, ratifierIds: value.ratifierIds });
const actors = policy => [...(policy.members ?? []).map(value => ({ ...value, role: "recovery" })), ...(policy.ratifiers ?? []).map(value => ({ ...value, role: "ratifier" }))];
export const verifyRecoveryPolicyTransition = (transition, previousPolicy, nextPolicy) => {
  const previous = actors(previousPolicy), next = actors(nextPolicy), changed = previous.filter(item => { const candidate = next.find(value => value.id === item.id && value.role === item.role); return !candidate || candidate.keyDigest !== item.keyDigest; });
  const replacement = next.find(value => value.id === transition?.replacedId && value.role === changed[0]?.role);
  const unchanged = previous.filter(value => value.id !== transition?.replacedId).every(value => next.some(candidate => candidate.id === value.id && candidate.role === value.role && candidate.keyDigest === value.keyDigest));
  const payload = Buffer.from(JSON.stringify(body(transition ?? {}))), signers = (transition?.recoverySignerIds ?? []).map(id => previousPolicy.members?.find(value => value.id === id)), ratifiers = (transition?.ratifierIds ?? []).map(id => previousPolicy.ratifiers?.find(value => value.id === id));
  const checks = {
    exactReplacement: previous.length === 5 && next.length === 5 && changed.length === 1 && changed[0].id === transition?.replacedId && replacement && unchanged && changed[0].keyDigest === transition.previousKeyDigest && replacement.keyDigest === transition.nextKeyDigest && transition.previousKeyDigest !== transition.nextKeyDigest,
    bindings: transition?.schema === "cct-recovery-policy-transition/v1" && transition.previousPolicyDigest === digest(`${JSON.stringify(previousPolicy)}\n`) && transition.nextPolicyDigest === digest(`${JSON.stringify(nextPolicy)}\n`) && /^sha256:[0-9a-f]{64}$/.test(transition.compromiseEvidenceDigest ?? "") && Number.isSafeInteger(transition.effectiveAfterStatusGeneration),
    oldQuorum: new Set(transition?.recoverySignerIds ?? []).size === signers.length && signers.length >= previousPolicy.threshold && signers.every(Boolean) && signers.every((value, index) => verify(null, payload, createPublicKey(value.publicKeyPem), Buffer.from(transition.recoverySignaturesBase64?.[index] ?? "", "base64"))),
    ratification: new Set(transition?.ratifierIds ?? []).size === ratifiers.length && ratifiers.length === previousPolicy.ratifiers?.length && ratifiers.every(Boolean) && ratifiers.every((value, index) => verify(null, payload, createPublicKey(value.publicKeyPem), Buffer.from(transition.ratifierSignaturesBase64?.[index] ?? "", "base64"))),
    replacementPossession: Boolean(replacement) && verify(null, payload, createPublicKey(replacement.publicKeyPem), Buffer.from(transition.nextMemberSignatureBase64 ?? "", "base64"))
  };
  return { ok: Object.values(checks).every(Boolean), checks, replacedId: transition?.replacedId, effectiveAfterStatusGeneration: transition?.effectiveAfterStatusGeneration };
};
