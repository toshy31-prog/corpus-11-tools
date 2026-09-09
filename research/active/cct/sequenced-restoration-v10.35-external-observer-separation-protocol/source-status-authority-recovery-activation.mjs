import { createHash, createPublicKey, verify } from "node:crypto";
import { verifySourceStatusAuthorityResolution } from "./source-status-authority-resolution.mjs";
import { verifyRecoveryTimeEvidence } from "./recovery-time-evidence.mjs";
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const statusBody = value => ({ schema: value.schema, registryStateDigest: value.registryStateDigest, generation: value.generation, issuedAtMs: value.issuedAtMs, previousStatusDigest: value.previousStatusDigest, revokedSourceKeyDigests: value.revokedSourceKeyDigests, knownEquivocationDigests: value.knownEquivocationDigests, knownRecoveryPolicyEquivocationDigests: value.knownRecoveryPolicyEquivocationDigests, appliedPolicyResolutionDigests: value.appliedPolicyResolutionDigests, policyResolutionApplicationRecords: value.policyResolutionApplicationRecords });
const activationBody = value => ({ schema: value.schema, registryStateDigest: value.registryStateDigest, resolutionDigest: value.resolutionDigest, selectedAuthorityKeyDigest: value.selectedAuthorityKeyDigest, effectiveGeneration: value.effectiveGeneration, firstStatusDigest: value.firstStatusDigest, observedAtMs: value.observedAtMs });
const transitionBody = value => ({ schema: value.schema, registryStateDigest: value.registryStateDigest, previousAuthorityKeyDigest: value.previousAuthorityKeyDigest, nextAuthorityKeyDigest: value.nextAuthorityKeyDigest, effectiveGeneration: value.effectiveGeneration });
export const verifySourceStatusAuthorityRecoveryActivation = (activation, resolution, registry, previousStatus, firstStatus, policy, selectedAuthorityPublicKeyPem, timeEvidence) => {
  const resolutionResult = verifySourceStatusAuthorityResolution(resolution, registry, previousStatus, policy, selectedAuthorityPublicKeyPem);
  let key; try { key = createPublicKey(selectedAuthorityPublicKeyPem); } catch { return { ok: false }; }
  const resolutionDigest = digest(`${JSON.stringify(resolution)}\n`), firstStatusDigest = digest(`${JSON.stringify(firstStatus)}\n`), previousStatusDigest = digest(`${JSON.stringify(previousStatus)}\n`);
  const checks = {
    resolutionValid: resolutionResult.ok,
    activationBindings: activation?.schema === "cct-source-status-authority-recovery-activation/v1" && activation.registryStateDigest === registry.stateDigest && activation.resolutionDigest === resolutionDigest && activation.selectedAuthorityKeyDigest === resolution.selectedAuthorityKeyDigest && activation.effectiveGeneration === resolution.effectiveGeneration && activation.firstStatusDigest === firstStatusDigest && Number.isSafeInteger(activation.observedAtMs) && activation.observedAtMs >= resolution.resolvedAtMs && activation.observedAtMs <= resolution.activateByMs,
    activationSignature: verify(null, Buffer.from(JSON.stringify(activationBody(activation ?? {}))), key, Buffer.from(activation?.signatureBase64 ?? "", "base64")),
    firstStatusContinuity: firstStatus.schema === "cct-control-evidence-source-registry-status/v1" && firstStatus.registryStateDigest === registry.stateDigest && firstStatus.generation === resolution.effectiveGeneration && firstStatus.issuedAtMs >= activation.observedAtMs && firstStatus.issuedAtMs <= resolution.firstStatusByMs && firstStatus.previousStatusDigest === previousStatusDigest && previousStatus.revokedSourceKeyDigests.every(value => firstStatus.revokedSourceKeyDigests.includes(value)) && previousStatus.knownEquivocationDigests.every(value => firstStatus.knownEquivocationDigests.includes(value)) && previousStatus.knownRecoveryPolicyEquivocationDigests.every(value => firstStatus.knownRecoveryPolicyEquivocationDigests.includes(value)) && previousStatus.appliedPolicyResolutionDigests.every(value => firstStatus.appliedPolicyResolutionDigests.includes(value)) && previousStatus.policyResolutionApplicationRecords.every(value => firstStatus.policyResolutionApplicationRecords.some(candidate => JSON.stringify(candidate) === JSON.stringify(value))),
    firstStatusSignature: verify(null, Buffer.from(JSON.stringify(statusBody(firstStatus))), key, Buffer.from(firstStatus.signatureBase64 ?? "", "base64"))
  };
  checks.independentTimeEvidence = verifyRecoveryTimeEvidence(timeEvidence, resolution, firstStatus, policy).ok;
  return { ok: Object.values(checks).every(Boolean), checks, resolutionValid: resolutionResult.ok, activationObserved: checks.activationBindings && checks.activationSignature, firstPostRecoveryStatusObserved: checks.firstStatusContinuity && checks.firstStatusSignature };
};

export const verifyPostRecoveryStatusContinuation = (statuses, registry, selectedAuthorityPublicKeyPem, transitions = [], nextAuthorityPublicKeyPems = []) => {
  if (!Array.isArray(statuses) || statuses.length === 0) return false;
  let key; try { key = createPublicKey(selectedAuthorityPublicKeyPem); } catch { return false; }
  if (!Array.isArray(transitions) || transitions.length !== nextAuthorityPublicKeyPems.length) return false;
  const keys = [key];
  let currentKeyDigest = digest(key.export({ type: "spki", format: "der" })), previousGeneration = statuses[0].generation;
  for (let index = 0; index < transitions.length; index++) {
    const item = transitions[index]; let nextKey; try { nextKey = createPublicKey(nextAuthorityPublicKeyPems[index]); } catch { return false; }
    const nextDigest = digest(nextKey.export({ type: "spki", format: "der" })), payload = Buffer.from(JSON.stringify(transitionBody(item)));
    if (item.schema !== "cct-source-status-authority-transition/v1" || item.registryStateDigest !== registry.stateDigest || item.previousAuthorityKeyDigest !== currentKeyDigest || item.nextAuthorityKeyDigest !== nextDigest || item.effectiveGeneration <= previousGeneration || !verify(null, payload, keys.at(-1), Buffer.from(item.previousSignatureBase64 ?? "", "base64")) || !verify(null, payload, nextKey, Buffer.from(item.nextSignatureBase64 ?? "", "base64"))) return false;
    keys.push(nextKey); currentKeyDigest = nextDigest; previousGeneration = item.effectiveGeneration;
  }
  for (let index = 0; index < statuses.length; index++) {
    const value = statuses[index], previous = statuses[index - 1];
    const activeKey = keys[transitions.filter(item => item.effectiveGeneration <= value.generation).length];
    if (value.schema !== "cct-control-evidence-source-registry-status/v1" || value.registryStateDigest !== registry.stateDigest || (previous && (value.generation !== previous.generation + 1 || value.previousStatusDigest !== digest(`${JSON.stringify(previous)}\n`) || !previous.revokedSourceKeyDigests.every(item => value.revokedSourceKeyDigests.includes(item)) || !previous.knownEquivocationDigests.every(item => value.knownEquivocationDigests.includes(item)) || !previous.knownRecoveryPolicyEquivocationDigests.every(item => value.knownRecoveryPolicyEquivocationDigests.includes(item)) || !previous.appliedPolicyResolutionDigests.every(item => value.appliedPolicyResolutionDigests.includes(item)) || !previous.policyResolutionApplicationRecords.every(item => value.policyResolutionApplicationRecords.some(candidate => JSON.stringify(candidate) === JSON.stringify(item))))) || !verify(null, Buffer.from(JSON.stringify(statusBody(value))), activeKey, Buffer.from(value.signatureBase64 ?? "", "base64"))) return false;
  }
  return true;
};
