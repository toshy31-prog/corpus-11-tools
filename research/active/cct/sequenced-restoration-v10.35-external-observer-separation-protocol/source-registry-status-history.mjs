import { createHash, createPublicKey, verify } from "node:crypto";

const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const body = value => ({ schema: value.schema, registryStateDigest: value.registryStateDigest, generation: value.generation, issuedAtMs: value.issuedAtMs, previousStatusDigest: value.previousStatusDigest, scannerOwnershipRevocationHistoryDigest: value.scannerOwnershipRevocationHistoryDigest, revokedSourceKeyDigests: value.revokedSourceKeyDigests, knownEquivocationDigests: value.knownEquivocationDigests, knownRecoveryPolicyEquivocationDigests: value.knownRecoveryPolicyEquivocationDigests, appliedPolicyResolutionDigests: value.appliedPolicyResolutionDigests, policyResolutionApplicationRecords: value.policyResolutionApplicationRecords });
const transitionBody = value => ({ schema: value.schema, registryStateDigest: value.registryStateDigest, previousAuthorityKeyDigest: value.previousAuthorityKeyDigest, nextAuthorityKeyDigest: value.nextAuthorityKeyDigest, effectiveGeneration: value.effectiveGeneration });

export const verifySourceRegistryStatusHistory = (history, registry, authorityPublicKeyPem, transition = null, nextAuthorityPublicKeyPem = null) => {
  if (!Array.isArray(history) || history.length === 0) return { ok: false, current: null };
  let suppliedKeyDigest;
  try { suppliedKeyDigest = digest(createPublicKey(authorityPublicKeyPem).export({ type: "spki", format: "der" })); } catch { return { ok: false, current: null }; }
  if (suppliedKeyDigest !== registry.statusAuthorityKeyDigest) return { ok: false, current: null };
  const transitions = transition ? (Array.isArray(transition) ? transition : [transition]) : [];
  const nextPems = transition ? (Array.isArray(nextAuthorityPublicKeyPem) ? nextAuthorityPublicKeyPem : [nextAuthorityPublicKeyPem]) : [];
  const authorityKeys = [createPublicKey(authorityPublicKeyPem)];
  let currentDigest = registry.statusAuthorityKeyDigest, previousGeneration = 0;
  if (transitions.length !== nextPems.length) return { ok: false, current: null };
  for (let index = 0; index < transitions.length; index++) {
    const item = transitions[index]; let nextKey;
    try { nextKey = createPublicKey(nextPems[index]); } catch { return { ok: false, current: null }; }
    const nextDigest = digest(nextKey.export({ type: "spki", format: "der" }));
    const payload = Buffer.from(JSON.stringify(transitionBody(item)));
    const transitionValid = item.schema === "cct-source-status-authority-transition/v1" && item.registryStateDigest === registry.stateDigest && item.previousAuthorityKeyDigest === currentDigest && item.nextAuthorityKeyDigest === nextDigest && currentDigest !== nextDigest && Number.isSafeInteger(item.effectiveGeneration) && item.effectiveGeneration > previousGeneration &&
      verify(null, payload, authorityKeys.at(-1), Buffer.from(item.previousSignatureBase64 ?? "", "base64")) && verify(null, payload, nextKey, Buffer.from(item.nextSignatureBase64 ?? "", "base64"));
    if (!transitionValid) return { ok: false, current: null };
    authorityKeys.push(nextKey); currentDigest = nextDigest; previousGeneration = item.effectiveGeneration;
  }
  let previousDigest = null;
  for (let index = 0; index < history.length; index++) {
    const value = history[index];
    const sorted = [...(value.revokedSourceKeyDigests ?? [])].sort();
    const sortedEquivocations = [...(value.knownEquivocationDigests ?? [])].sort();
    const sortedPolicyEquivocations = [...(value.knownRecoveryPolicyEquivocationDigests ?? [])].sort();
    const sortedPolicyResolutions = [...(value.appliedPolicyResolutionDigests ?? [])].sort();
    const applicationRecords = value.policyResolutionApplicationRecords ?? [];
    const recordsValid = Array.isArray(applicationRecords) && JSON.stringify(applicationRecords) === JSON.stringify([...applicationRecords].sort((left, right) => left.resolutionDigest.localeCompare(right.resolutionDigest))) && new Set(applicationRecords.map(item => item.resolutionDigest)).size === applicationRecords.length && new Set(applicationRecords.map(item => item.incidentSetDigest)).size === applicationRecords.length && applicationRecords.every(item => /^sha256:[0-9a-f]{64}$/.test(item.resolutionDigest) && /^sha256:[0-9a-f]{64}$/.test(item.incidentSetDigest) && /^sha256:[0-9a-f]{64}$/.test(item.selectedNextPolicyDigest) && Number.isSafeInteger(item.effectiveGeneration));
    const valid = value.schema === "cct-control-evidence-source-registry-status/v1" && value.registryStateDigest === registry.stateDigest && value.generation === index && value.previousStatusDigest === previousDigest &&
      Number.isSafeInteger(value.issuedAtMs) && Array.isArray(value.revokedSourceKeyDigests) && JSON.stringify(value.revokedSourceKeyDigests) === JSON.stringify(sorted) && new Set(sorted).size === sorted.length && Array.isArray(value.knownEquivocationDigests) && JSON.stringify(value.knownEquivocationDigests) === JSON.stringify(sortedEquivocations) && new Set(sortedEquivocations).size === sortedEquivocations.length && Array.isArray(value.knownRecoveryPolicyEquivocationDigests) && JSON.stringify(value.knownRecoveryPolicyEquivocationDigests) === JSON.stringify(sortedPolicyEquivocations) && new Set(sortedPolicyEquivocations).size === sortedPolicyEquivocations.length && Array.isArray(value.appliedPolicyResolutionDigests) && JSON.stringify(value.appliedPolicyResolutionDigests) === JSON.stringify(sortedPolicyResolutions) && new Set(sortedPolicyResolutions).size === sortedPolicyResolutions.length && recordsValid &&
      verify(null, Buffer.from(JSON.stringify(body(value))), authorityKeys[transitions.filter(item => item.effectiveGeneration <= index).length], Buffer.from(value.signatureBase64 ?? "", "base64"));
    if (!valid) return { ok: false, current: null };
    if (index > 0 && !history[index - 1].revokedSourceKeyDigests.every(item => sorted.includes(item))) return { ok: false, current: null };
    if (index > 0 && !history[index - 1].knownEquivocationDigests.every(item => sortedEquivocations.includes(item))) return { ok: false, current: null };
    if (index > 0 && !history[index - 1].knownRecoveryPolicyEquivocationDigests.every(item => sortedPolicyEquivocations.includes(item))) return { ok: false, current: null };
    if (index > 0 && !history[index - 1].appliedPolicyResolutionDigests.every(item => sortedPolicyResolutions.includes(item))) return { ok: false, current: null };
    if (index > 0 && !history[index - 1].policyResolutionApplicationRecords.every(item => applicationRecords.some(candidate => JSON.stringify(candidate) === JSON.stringify(item)))) return { ok: false, current: null };
    previousDigest = digest(`${JSON.stringify(value)}\n`);
  }
  return { ok: true, current: history.at(-1), statusDigest: previousDigest, authorityRotationCount: transitions.length };
};
