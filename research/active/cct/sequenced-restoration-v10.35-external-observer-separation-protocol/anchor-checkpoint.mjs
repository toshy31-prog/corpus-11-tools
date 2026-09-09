import { createHash, createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
import { closeSync, existsSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { atomicReplaceDurable } from "./atomic-replace.mjs";

const [checkpointPath, registryPublicKeyPath, anchorPrivateKeyPath, anchorStatePath, receiptPath, transitionPath, previousRegistryPublicKeyPath, recoveryPolicyPath, emergencyTransitionPath, emergencyEvidencePath, emergencyRatificationPath] = process.argv.slice(2);
if (!receiptPath) {
  process.stderr.write("usage: node anchor-checkpoint.mjs CHECKPOINT REGISTRY_PUBLIC_KEY ANCHOR_PRIVATE_KEY ANCHOR_STATE RECEIPT\n");
  process.exit(2);
}
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const checkpointText = readFileSync(checkpointPath, "utf8");
const checkpoint = JSON.parse(checkpointText);
const checkpointBody = { schema: checkpoint.schema, registryStateDigest: checkpoint.registryStateDigest, generation: checkpoint.generation, totalRecords: checkpoint.totalRecords, previousCheckpointDigest: checkpoint.previousCheckpointDigest };
const checkpointSignatureValid = ["cct-replay-registry-checkpoint/v1", "cct-class-artifact-history-checkpoint/v1", "cct-authority-status-checkpoint/v1", "cct-host-comparison-freeze-registry-checkpoint/v1", "cct-control-source-presence-history-checkpoint/v1"].includes(checkpoint.schema) &&
  verify(null, Buffer.from(JSON.stringify(checkpointBody)), createPublicKey(readFileSync(registryPublicKeyPath)), Buffer.from(checkpoint.signatureBase64, "base64"));
if (!checkpointSignatureValid) {
  process.stderr.write(`${JSON.stringify({ ok: false, failure: "checkpoint_signature_invalid" })}\n`);
  process.exit(1);
}

const checkpointDigest = digest(checkpointText);
const registryKey = createPublicKey(readFileSync(registryPublicKeyPath));
const registryKeyDigest = digest(registryKey.export({ type: "spki", format: "der" }));
const recoveryPolicyText = recoveryPolicyPath && recoveryPolicyPath !== "-" ? readFileSync(recoveryPolicyPath, "utf8") : null;
const recoveryPolicyDigest = recoveryPolicyText ? digest(recoveryPolicyText) : null;
const recoveryPolicy = recoveryPolicyText ? JSON.parse(recoveryPolicyText) : null;
const embeddedControlRegistryValid = policy => {
  if (!policy) return true;
  const registry = policy.controlRegistry;
  const profiles = registry?.profiles;
  const controlBody = registry && { schema: registry.schema, sourceRegistryDigest: registry.sourceRegistryDigest, sourceRegistry: registry.sourceRegistry, profiles };
  const allKeys = [...(policy.members ?? []), ...(policy.ratifiers ?? [])];
  const roots = Array.isArray(profiles) ? profiles.flatMap(value => value.evidenceRoots ?? []) : [];
  const lineageDigests = roots.flatMap(value => [value.documentDigest, ...(value.upstreamDigests ?? [])]);
  const sourceRegistry = registry?.sourceRegistry;
  const sourceBody = sourceRegistry && { schema: sourceRegistry.schema, statusAuthorityKeyDigest: sourceRegistry.statusAuthorityKeyDigest, sources: sourceRegistry.sources };
  const attestationBody = value => ({ schema: value.schema, subjectId: value.subjectId, subjectControllerId: value.subjectControllerId, subjectFailureDomain: value.subjectFailureDomain, sourceId: value.sourceId, sourceControllerId: value.sourceControllerId, sourceFailureDomain: value.sourceFailureDomain, documentDigest: value.documentDigest, upstreamDigests: value.upstreamDigests, lineageComplete: value.lineageComplete });
  const presence = policy.sourcePresenceEvidence;
  let presenceValid = false;
  try {
    const challengeText = Buffer.from(presence.challengeTextBase64, "base64").toString("utf8");
    const challenge = JSON.parse(challengeText);
    const presenceBody = value => ({ schema: value.schema, sourceId: value.sourceId, challengeDigest: value.challengeDigest, sourceRegistryDigest: value.sourceRegistryDigest, hostComparisonContextDigest: value.hostComparisonContextDigest, hostScopeDigest: value.hostScopeDigest, networkOperatorId: value.networkOperatorId, networkFailureDomain: value.networkFailureDomain, observedAtMs: value.observedAtMs });
    presenceValid = policy.sourcePresenceEvidenceDigest === digest(`${JSON.stringify(presence)}\n`) && presence.schema === "cct-control-source-presence-evidence/v1" &&
      presence.sourceRegistryDigest === digest(`${JSON.stringify(sourceRegistry)}\n`) && presence.verifiedAtMs <= challenge.expiresAtMs &&
      JSON.stringify(presence.attestations.map(value => value.sourceId).sort()) === JSON.stringify(sourceRegistry.sources.map(value => value.sourceId).sort()) &&
      new Set(presence.attestations.map(value => value.hostScopeDigest)).size === presence.attestations.length &&
      presence.attestations.every(value => {
        const source = sourceRegistry.sources.find(candidate => candidate.sourceId === value.sourceId);
        return source && value.networkOperatorId === source.networkOperatorId && value.networkFailureDomain === source.networkFailureDomain && value.challengeDigest === digest(challengeText) && value.sourceRegistryDigest === challenge.sourceRegistryDigest &&
          verify(null, Buffer.from(JSON.stringify(presenceBody(value))), createPublicKey(source.publicKeyPem), Buffer.from(value.signatureBase64 ?? "", "base64"));
      });
  } catch {}
  return registry?.schema === "cct-recovery-control-registry/v1" && registry.stateDigest === digest(JSON.stringify(controlBody)) &&
    policy.controlRegistryDigest === digest(`${JSON.stringify(registry)}\n`) && Array.isArray(profiles) && profiles.length === 5 &&
    sourceRegistry?.schema === "cct-control-evidence-source-registry/v1" && sourceRegistry.stateDigest === digest(JSON.stringify(sourceBody)) &&
    registry.sourceRegistryDigest === digest(`${JSON.stringify(sourceRegistry)}\n`) && presenceValid &&
    new Set(profiles.map(value => value.id)).size === 5 && new Set(profiles.map(value => value.controllerId)).size === 5 && new Set(profiles.map(value => value.failureDomain)).size === 5 &&
    allKeys.every(member => profiles.some(profile => profile.id === member.id && profile.keyDigest === member.keyDigest)) &&
    profiles.every(profile => Array.isArray(profile.evidenceRoots) && profile.evidenceRoots.length >= 2 &&
      new Set(profile.evidenceRoots.map(value => value.sourceId)).size === profile.evidenceRoots.length &&
      new Set(profile.evidenceRoots.map(value => value.sourceControllerId)).size === profile.evidenceRoots.length &&
      new Set(profile.evidenceRoots.map(value => value.failureDomain)).size === profile.evidenceRoots.length &&
      profile.evidenceRoots.every(value => {
        const source = sourceRegistry.sources.find(sourceValue => sourceValue.sourceId === value.sourceId);
        return /^sha256:[0-9a-f]{64}$/.test(value.documentDigest) && value.sourceControllerId !== profile.controllerId && value.sourceFailureDomain !== profile.failureDomain &&
          value.lineageComplete === true && Array.isArray(value.upstreamDigests) && new Set(value.upstreamDigests).size === value.upstreamDigests.length &&
          source && source.controllerId === value.sourceControllerId && source.failureDomain === value.sourceFailureDomain &&
          verify(null, Buffer.from(JSON.stringify(attestationBody(value))), createPublicKey(source.publicKeyPem), Buffer.from(value.signatureBase64 ?? "", "base64"));
      })) && new Set(lineageDigests).size === lineageDigests.length;
};
const recoveryPolicyValid = !recoveryPolicy || recoveryPolicy.schema === "cct-registry-recovery-policy/v1" && recoveryPolicy.threshold === 2 &&
  Array.isArray(recoveryPolicy.members) && recoveryPolicy.members.length === 3 &&
  Array.isArray(recoveryPolicy.ratifiers) && recoveryPolicy.ratifiers.length === 2 &&
  new Set([...recoveryPolicy.members, ...recoveryPolicy.ratifiers].map(value => value.id)).size === 5 &&
  new Set([...recoveryPolicy.members, ...recoveryPolicy.ratifiers].map(value => value.keyDigest)).size === 5 &&
  embeddedControlRegistryValid(recoveryPolicy) && [...recoveryPolicy.members, ...recoveryPolicy.ratifiers].every(value => {
    try { return digest(createPublicKey(value.publicKeyPem).export({ type: "spki", format: "der" })) === value.keyDigest; } catch { return false; }
  });
const validateAuthorityTransition = previous => {
  if (!transitionPath || transitionPath === "-" || !previousRegistryPublicKeyPath || previousRegistryPublicKeyPath === "-") return false;
  const transition = JSON.parse(readFileSync(transitionPath, "utf8"));
  const previousKey = createPublicKey(readFileSync(previousRegistryPublicKeyPath));
  const previousKeyDigest = digest(previousKey.export({ type: "spki", format: "der" }));
  const body = {
    schema: transition.schema,
    checkpointSchema: transition.checkpointSchema,
    previousRegistryKeyDigest: transition.previousRegistryKeyDigest,
    nextRegistryKeyDigest: transition.nextRegistryKeyDigest,
    previousAnchorReceiptDigest: transition.previousAnchorReceiptDigest,
    previousCheckpointDigest: transition.previousCheckpointDigest,
    effectiveGeneration: transition.effectiveGeneration
  };
  const payload = Buffer.from(JSON.stringify(body));
  return transition.schema === "cct-registry-authority-transition/v1" &&
    transition.checkpointSchema === checkpoint.schema &&
    previousKeyDigest === previous.registryKeyDigest &&
    transition.previousRegistryKeyDigest === previous.registryKeyDigest &&
    transition.nextRegistryKeyDigest === registryKeyDigest &&
    transition.previousAnchorReceiptDigest === previous.receiptDigest &&
    transition.previousCheckpointDigest === previous.checkpointDigest &&
    transition.effectiveGeneration === checkpoint.generation &&
    verify(null, payload, previousKey, Buffer.from(transition.previousSignatureBase64 ?? "", "base64")) &&
    verify(null, payload, registryKey, Buffer.from(transition.nextSignatureBase64 ?? "", "base64"));
};
const validateEmergencyTransition = previous => {
  if (!recoveryPolicyText || !emergencyTransitionPath || !emergencyEvidencePath || !emergencyRatificationPath || !previousRegistryPublicKeyPath || previousRegistryPublicKeyPath === "-") return false;
  const policy = recoveryPolicy;
  const transition = JSON.parse(readFileSync(emergencyTransitionPath, "utf8"));
  const transitionText = readFileSync(emergencyTransitionPath, "utf8");
  const ratification = JSON.parse(readFileSync(emergencyRatificationPath, "utf8"));
  const evidenceText = readFileSync(emergencyEvidencePath, "utf8");
  const evidence = JSON.parse(evidenceText);
  const previousKey = createPublicKey(readFileSync(previousRegistryPublicKeyPath));
  const previousKeyDigest = digest(previousKey.export({ type: "spki", format: "der" }));
  const evidenceCheckpoints = (evidence.checkpointTextsBase64 ?? []).map(value => JSON.parse(Buffer.from(value, "base64").toString("utf8")));
  const checkpointBody = value => ({ schema: value.schema, registryStateDigest: value.registryStateDigest, generation: value.generation, totalRecords: value.totalRecords, previousCheckpointDigest: value.previousCheckpointDigest });
  const evidenceValid = evidence.schema === "cct-registry-key-equivocation-evidence/v1" && evidence.registryKeyDigest === previous.registryKeyDigest &&
    previousKeyDigest === previous.registryKeyDigest && evidenceCheckpoints.length === 2 &&
    evidenceCheckpoints.every(value => verify(null, Buffer.from(JSON.stringify(checkpointBody(value))), previousKey, Buffer.from(value.signatureBase64 ?? "", "base64"))) &&
    evidenceCheckpoints[0].schema === evidenceCheckpoints[1].schema && evidenceCheckpoints[0].schema === evidence.checkpointSchema &&
    evidenceCheckpoints[0].generation === evidenceCheckpoints[1].generation && evidenceCheckpoints[0].generation === evidence.generation &&
    evidenceCheckpoints[0].previousCheckpointDigest === evidenceCheckpoints[1].previousCheckpointDigest && evidenceCheckpoints[0].previousCheckpointDigest === evidence.previousCheckpointDigest &&
    (evidenceCheckpoints[0].registryStateDigest !== evidenceCheckpoints[1].registryStateDigest || evidenceCheckpoints[0].totalRecords !== evidenceCheckpoints[1].totalRecords);
  const body = {
    schema: transition.schema, checkpointSchema: transition.checkpointSchema,
    previousRegistryKeyDigest: transition.previousRegistryKeyDigest, nextRegistryKeyDigest: transition.nextRegistryKeyDigest,
    previousAnchorReceiptDigest: transition.previousAnchorReceiptDigest, previousCheckpointDigest: transition.previousCheckpointDigest,
    effectiveGeneration: transition.effectiveGeneration, recoveryPolicyDigest: transition.recoveryPolicyDigest,
    compromiseEvidenceDigest: transition.compromiseEvidenceDigest, recoverySignerIds: transition.recoverySignerIds
  };
  const ratificationBody = {
    schema: ratification.schema, transitionDigest: ratification.transitionDigest,
    recoveryPolicyDigest: ratification.recoveryPolicyDigest, previousAnchorReceiptDigest: ratification.previousAnchorReceiptDigest,
    nextRegistryKeyDigest: ratification.nextRegistryKeyDigest, compromiseEvidenceDigest: ratification.compromiseEvidenceDigest,
    ratifierIds: ratification.ratifierIds, ratifiedAtMs: ratification.ratifiedAtMs
  };
  if (!recoveryPolicyValid || recoveryPolicyDigest !== previous.recoveryPolicyDigest ||
      transition.schema !== "cct-emergency-registry-authority-transition/v1" || transition.checkpointSchema !== checkpoint.schema ||
      transition.previousRegistryKeyDigest !== previous.registryKeyDigest || transition.nextRegistryKeyDigest !== registryKeyDigest ||
      transition.previousAnchorReceiptDigest !== previous.receiptDigest || transition.previousCheckpointDigest !== previous.checkpointDigest ||
      transition.effectiveGeneration !== checkpoint.generation || transition.recoveryPolicyDigest !== previous.recoveryPolicyDigest ||
      transition.compromiseEvidenceDigest !== digest(evidenceText) || !evidenceValid || new Set(transition.recoverySignerIds ?? []).size < policy.threshold ||
      ratification.schema !== "cct-emergency-transition-ratification/v1" || ratification.transitionDigest !== digest(transitionText) ||
      ratification.recoveryPolicyDigest !== previous.recoveryPolicyDigest || ratification.previousAnchorReceiptDigest !== previous.receiptDigest ||
      ratification.nextRegistryKeyDigest !== registryKeyDigest || ratification.compromiseEvidenceDigest !== transition.compromiseEvidenceDigest ||
      new Set(ratification.ratifierIds ?? []).size !== 2) return false;
  const payload = Buffer.from(JSON.stringify(body));
  const admitted = transition.recoverySignerIds.map(id => policy.members.find(value => value.id === id));
  const ratifiers = ratification.ratifierIds.map(id => policy.ratifiers.find(value => value.id === id));
  return admitted.every(Boolean) && admitted.every((member, index) => {
    const key = createPublicKey(member.publicKeyPem);
    return digest(key.export({ type: "spki", format: "der" })) === member.keyDigest &&
      verify(null, payload, key, Buffer.from(transition.recoverySignaturesBase64?.[index] ?? "", "base64"));
  }) && verify(null, payload, registryKey, Buffer.from(transition.nextSignatureBase64 ?? "", "base64")) &&
    ratifiers.every(Boolean) && ratifiers.every((member, index) => {
      const key = createPublicKey(member.publicKeyPem);
      return digest(key.export({ type: "spki", format: "der" })) === member.keyDigest &&
        verify(null, Buffer.from(JSON.stringify(ratificationBody)), key, Buffer.from(ratification.signaturesBase64?.[index] ?? "", "base64"));
    });
};
const anchorPrivateKey = createPrivateKey(readFileSync(anchorPrivateKeyPath));
const anchorPublicKey = createPublicKey(anchorPrivateKey);
const lockPath = `${anchorStatePath}.lock`;
let lock;
try {
  lock = openSync(lockPath, "wx", 0o600);
  const bootId = readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim();
  const startTicks = readFileSync("/proc/self/stat", "utf8").trim().split(/\s+/)[21];
  writeFileSync(lock, `${JSON.stringify({ schema: "cct-process-lock/v1", pid: process.pid, bootId, startTicks })}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({ ok: false, failure: "anchor_locked", code: error.code })}\n`);
  process.exit(1);
}
try {
  const previous = existsSync(anchorStatePath) ? JSON.parse(readFileSync(anchorStatePath, "utf8")) : null;
  if (!previous && !recoveryPolicyValid) {
    process.stderr.write(`${JSON.stringify({ ok: false, failure: "recovery_policy_invalid" })}\n`);
    process.exitCode = 1;
  }
  if (previous) {
    const priorReceipt = previous.receipt;
    const priorBody = priorReceipt && { schema: priorReceipt.schema, checkpointSchema: priorReceipt.checkpointSchema, registryKeyDigest: priorReceipt.registryKeyDigest, recoveryPolicyDigest: priorReceipt.recoveryPolicyDigest, authorityTransitionDigest: priorReceipt.authorityTransitionDigest, emergencyRatificationDigest: priorReceipt.emergencyRatificationDigest, checkpointDigest: priorReceipt.checkpointDigest, registryStateDigest: priorReceipt.registryStateDigest, generation: priorReceipt.generation, totalRecords: priorReceipt.totalRecords, previousAnchorReceiptDigest: priorReceipt.previousAnchorReceiptDigest };
    const previousValid = previous.schema === "cct-monotonic-anchor-state/v2" &&
      previous.generation === priorReceipt?.generation &&
      previous.checkpointSchema === priorReceipt?.checkpointSchema &&
      previous.registryKeyDigest === priorReceipt?.registryKeyDigest &&
      previous.recoveryPolicyDigest === priorReceipt?.recoveryPolicyDigest &&
      previous.checkpointDigest === priorReceipt?.checkpointDigest &&
      previous.receiptDigest === digest(`${JSON.stringify(priorReceipt)}\n`) &&
      verify(null, Buffer.from(JSON.stringify(priorBody)), anchorPublicKey, Buffer.from(priorReceipt?.signatureBase64 ?? "", "base64"));
    if (!previousValid) {
      process.stderr.write(`${JSON.stringify({ ok: false, failure: "anchor_state_integrity_invalid" })}\n`);
      process.exitCode = 1;
    }
  }
  if (!process.exitCode && previous && checkpoint.generation <= previous.generation) {
    process.stderr.write(`${JSON.stringify({ ok: false, failure: "anchor_generation_not_increasing", previousGeneration: previous.generation, proposedGeneration: checkpoint.generation })}\n`);
    process.exitCode = 1;
  } else if (!process.exitCode && previous && checkpoint.schema !== previous.checkpointSchema) {
    process.stderr.write(`${JSON.stringify({ ok: false, failure: "anchor_authority_substitution", expectedCheckpointSchema: previous.checkpointSchema, receivedCheckpointSchema: checkpoint.schema, expectedRegistryKeyDigest: previous.registryKeyDigest, receivedRegistryKeyDigest: registryKeyDigest })}\n`);
    process.exitCode = 1;
  } else if (!process.exitCode && previous && registryKeyDigest !== previous.registryKeyDigest && !validateAuthorityTransition(previous) && !validateEmergencyTransition(previous)) {
    process.stderr.write(`${JSON.stringify({ ok: false, failure: "anchor_authority_substitution", expectedCheckpointSchema: previous.checkpointSchema, receivedCheckpointSchema: checkpoint.schema, expectedRegistryKeyDigest: previous.registryKeyDigest, receivedRegistryKeyDigest: registryKeyDigest, transitionValid: false })}\n`);
    process.exitCode = 1;
  } else if (!process.exitCode && previous && checkpoint.previousCheckpointDigest !== previous.checkpointDigest) {
    process.stderr.write(`${JSON.stringify({ ok: false, failure: "checkpoint_predecessor_mismatch", expected: previous.checkpointDigest, received: checkpoint.previousCheckpointDigest })}\n`);
    process.exitCode = 1;
  } else if (!process.exitCode && !previous && checkpoint.previousCheckpointDigest !== null) {
    process.stderr.write(`${JSON.stringify({ ok: false, failure: "checkpoint_genesis_predecessor_not_null", received: checkpoint.previousCheckpointDigest })}\n`);
    process.exitCode = 1;
  } else if (!process.exitCode) {
    const receiptBody = {
      schema: "cct-monotonic-anchor-receipt/v2",
      checkpointSchema: checkpoint.schema,
      registryKeyDigest,
      recoveryPolicyDigest: previous?.recoveryPolicyDigest ?? recoveryPolicyDigest,
      authorityTransitionDigest: previous && registryKeyDigest !== previous.registryKeyDigest ? digest(readFileSync(validateAuthorityTransition(previous) ? transitionPath : emergencyTransitionPath, "utf8")) : null,
      emergencyRatificationDigest: previous && registryKeyDigest !== previous.registryKeyDigest && !validateAuthorityTransition(previous) ? digest(readFileSync(emergencyRatificationPath, "utf8")) : null,
      checkpointDigest,
      registryStateDigest: checkpoint.registryStateDigest,
      generation: checkpoint.generation,
      totalRecords: checkpoint.totalRecords,
      previousAnchorReceiptDigest: previous?.receiptDigest ?? null,
    };
    const receipt = { ...receiptBody, signatureBase64: sign(null, Buffer.from(JSON.stringify(receiptBody)), anchorPrivateKey).toString("base64") };
    const receiptText = `${JSON.stringify(receipt)}\n`;
    const state = { schema: "cct-monotonic-anchor-state/v2", generation: checkpoint.generation, checkpointSchema: checkpoint.schema, registryKeyDigest, recoveryPolicyDigest: receipt.recoveryPolicyDigest, checkpointDigest, receiptDigest: digest(receiptText), receipt };
    atomicReplaceDurable(anchorStatePath, `${JSON.stringify(state)}\n`);
    atomicReplaceDurable(receiptPath, receiptText);
    process.stdout.write(`${JSON.stringify({ ok: true, generation: state.generation, checkpointDigest, receiptDigest: state.receiptDigest })}\n`);
  }
} finally {
  closeSync(lock);
  unlinkSync(lockPath);
}
