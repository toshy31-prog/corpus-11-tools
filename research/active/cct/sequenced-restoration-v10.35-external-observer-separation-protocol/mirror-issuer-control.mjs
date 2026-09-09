import { createHash, createPublicKey, verify } from "node:crypto";
import { verifySourceRegistryStatusHistory } from "./source-registry-status-history.mjs";
import { detectSourceStatusAuthorityEquivocation } from "./source-status-authority-equivocation.mjs";
import { verifyPostRecoveryStatusContinuation, verifySourceStatusAuthorityRecoveryActivation } from "./source-status-authority-recovery-activation.mjs";
import { selectActiveRecoveryPolicy } from "./recovery-policy-history.mjs";
import { detectRecoveryPolicyEquivocation } from "./recovery-policy-equivocation.mjs";
import { verifyRecoveryPolicyEquivocationResolution } from "./recovery-policy-equivocation-resolution.mjs";

const dimensions = ["effectiveOwnerId", "keyOperatorId", "decisiveFunderId", "vetoControllerId"];
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const validDigest = value => /^sha256:[0-9a-f]{64}$/.test(value ?? "");
const evidenceBody = value => ({ schema: value.schema, issuerId: value.issuerId, dimension: value.dimension, claimedValue: value.claimedValue, sourceId: value.sourceId, sourceControllerId: value.sourceControllerId, sourceFailureDomain: value.sourceFailureDomain, documentDigest: value.documentDigest, upstreamDigests: value.upstreamDigests, lineageComplete: value.lineageComplete });

export const assessMirrorIssuerControl = (corroborations, profiles, claims, challenges, sourceRegistry, sourceStatusHistory, sourceAuthorityPublicKeyPem, sourceAuthorityTransition = null, nextSourceAuthorityPublicKeyPem = null, equivocationBundles = [], recoveryBundles = []) => {
  const recoveryCandidate = recoveryBundles.length === 1 ? recoveryBundles[0] : null;
  const firstRecoveryIndex = recoveryCandidate ? sourceStatusHistory.findIndex(value => digest(`${JSON.stringify(value)}\n`) === digest(`${JSON.stringify(recoveryCandidate.firstStatus)}\n`)) : -1;
  const preRecoveryHistory = firstRecoveryIndex > 0 ? sourceStatusHistory.slice(0, firstRecoveryIndex) : sourceStatusHistory;
  const preRecoveryStatus = verifySourceRegistryStatusHistory(preRecoveryHistory, sourceRegistry, sourceAuthorityPublicKeyPem, sourceAuthorityTransition, nextSourceAuthorityPublicKeyPem);
  const equivocations = equivocationBundles.map(value => detectSourceStatusAuthorityEquivocation(value.left, value.leftNextKeyPem, value.right, value.rightNextKeyPem, value.previousKeyPem));
  const detectedEquivocationDigests = equivocations.filter(value => value.equivocation).flatMap(value => [value.leftTransitionDigest, value.rightTransitionDigest]);
  const current = sourceStatusHistory.at(-1);
  const equivocationInventoryComplete = detectedEquivocationDigests.every(value => current?.knownEquivocationDigests.includes(value));
  const policyConflicts = recoveryBundles.map(value => (value.policyConflictBundles ?? []).map(conflict => detectRecoveryPolicyEquivocation(conflict.left, conflict.leftNextPolicy, conflict.right, conflict.rightNextPolicy, conflict.previousPolicy)));
  const detectedPolicyEquivocationDigests = policyConflicts.flatMap(items => items.filter(value => value.equivocation).flatMap(value => [value.leftTransitionDigest, value.rightTransitionDigest]));
  const policyEquivocationInventoryComplete = detectedPolicyEquivocationDigests.every(value => current?.knownRecoveryPolicyEquivocationDigests.includes(value));
  const policyResolutionResults = recoveryBundles.map(value => { const bundle = value.policyEquivocationResolutionBundle; return bundle ? verifyRecoveryPolicyEquivocationResolution(bundle.resolution, bundle.conflict, bundle.previousPolicy, value.previousStatus) : { ok: false }; });
  const policySelections = recoveryBundles.map((value, index) => {
    const resolved = policyResolutionResults[index];
    const initial = resolved.ok ? resolved.selectedNextPolicy : (value.initialPolicy ?? value.policy);
    const transitions = resolved.ok ? (value.postPolicyResolutionTransitions ?? []) : (value.policyTransitions ?? []);
    const successors = resolved.ok ? (value.postPolicyResolutionSuccessorPolicies ?? []) : (value.successorPolicies ?? []);
    const selection = selectActiveRecoveryPolicy(initial, transitions, successors, value.previousStatus?.generation);
    const conflictsResolved = !policyConflicts[index].some(conflict => conflict.equivocation) || resolved.ok;
    return { ...selection, conflictsResolved, ok: selection.ok && conflictsResolved };
  });
  const recoveryResults = recoveryBundles.map((value, index) => policySelections[index].ok ? verifySourceStatusAuthorityRecoveryActivation(value.activation, value.resolution, sourceRegistry, value.previousStatus, value.firstStatus, policySelections[index].activePolicy, value.selectedAuthorityPublicKeyPem, value.timeEvidence) : { ok: false });
  const previousMatchesHistory = firstRecoveryIndex > 0 && digest(`${JSON.stringify(sourceStatusHistory[firstRecoveryIndex - 1])}\n`) === digest(`${JSON.stringify(recoveryCandidate?.previousStatus)}\n`);
  const continuationValid = firstRecoveryIndex >= 0 && verifyPostRecoveryStatusContinuation(sourceStatusHistory.slice(firstRecoveryIndex), sourceRegistry, recoveryCandidate?.selectedAuthorityPublicKeyPem, recoveryCandidate?.postRecoveryTransitions ?? [], recoveryCandidate?.postRecoveryAuthorityPublicKeyPems ?? []);
  const recoveryApplied = recoveryBundles.length === 1 && recoveryResults[0].ok && previousMatchesHistory && continuationValid;
  const policyResolutionDigest = recoveryCandidate?.policyEquivocationResolutionBundle && digest(`${JSON.stringify(recoveryCandidate.policyEquivocationResolutionBundle.resolution)}\n`);
  const policyResolution = recoveryCandidate?.policyEquivocationResolutionBundle?.resolution;
  const incidentSetDigest = policyResolution && digest(JSON.stringify(policyResolution.resolvedTransitionDigests));
  const expectedApplication = policyResolution && { resolutionDigest: policyResolutionDigest, incidentSetDigest, selectedNextPolicyDigest: policyResolution.selectedNextPolicyDigest, effectiveGeneration: recoveryCandidate.firstStatus.generation };
  const previousApplications = recoveryCandidate?.previousStatus.policyResolutionApplicationRecords ?? [], firstApplications = recoveryCandidate?.firstStatus.policyResolutionApplicationRecords ?? [];
  const policyResolutionEffectObserved = Boolean(policyResolution) && recoveryCandidate.firstStatus.generation > policyResolution.effectiveAfterStatusGeneration && recoveryCandidate.firstStatus.generation === recoveryCandidate.resolution.effectiveGeneration && recoveryCandidate.resolution.recoveryPolicyDigest === digest(`${JSON.stringify(policyResolutionResults[0]?.selectedNextPolicy)}\n`);
  const policyResolutionFresh = Boolean(policyResolutionDigest) && policyResolutionEffectObserved && !recoveryCandidate.previousStatus.appliedPolicyResolutionDigests.includes(policyResolutionDigest) && recoveryCandidate.firstStatus.appliedPolicyResolutionDigests.includes(policyResolutionDigest) && !previousApplications.some(value => value.resolutionDigest === policyResolutionDigest || value.incidentSetDigest === incidentSetDigest) && firstApplications.some(value => JSON.stringify(value) === JSON.stringify(expectedApplication));
  const policyResolutionApplied = recoveryBundles.length === 1 && policyResolutionResults[0].ok && policyResolutionFresh;
  const ordinaryStatus = recoveryBundles.length === 0 ? verifySourceRegistryStatusHistory(sourceStatusHistory, sourceRegistry, sourceAuthorityPublicKeyPem, sourceAuthorityTransition, nextSourceAuthorityPublicKeyPem) : null;
  const status = recoveryApplied ? { ok: preRecoveryStatus.ok, current } : (ordinaryStatus ?? { ok: false, current });
  const competingRecoveries = recoveryBundles.length > 1;
  const authoritySuspended = competingRecoveries || !equivocationInventoryComplete || !policyEquivocationInventoryComplete || ((current?.knownRecoveryPolicyEquivocationDigests.length ?? 0) > 0 && !policyResolutionApplied) || ((current?.knownEquivocationDigests.length ?? 0) > 0 && !recoveryApplied);
  const issuers = corroborations.flatMap(value => value.authorities.map(authority => ({ issuerId: authority.credential.issuerId, publicKeyPem: authority.issuerPublicKeyPem })));
  const profileMap = new Map(profiles.map(value => [value.issuerId, value]));
  const exactCoverage = issuers.length === 4 && profileMap.size === profiles.length && profiles.length === 4 && issuers.every(value => profileMap.has(value.issuerId));
  const audits = issuers.flatMap(issuer => dimensions.map(dimension => {
    const profile = profileMap.get(issuer.issuerId);
    const claim = claims.find(value => value.issuerId === issuer.issuerId && value.dimension === dimension);
    const open = challenges.filter(value => value.issuerId === issuer.issuerId && value.dimension === dimension && value.status !== "resolved");
    const roots = claim?.evidenceRoots ?? [];
    const rootsValid = roots.length >= 2 && new Set(roots.map(value => value.sourceId)).size === roots.length && new Set(roots.map(value => value.sourceControllerId)).size === roots.length && new Set(roots.map(value => value.sourceFailureDomain)).size === roots.length && roots.every(value => {
      const source = sourceRegistry?.sources?.find(candidate => candidate.sourceId === value.sourceId);
      return source && value.schema === "cct-mirror-issuer-control-evidence/v1" && value.issuerId === issuer.issuerId && value.dimension === dimension && value.claimedValue === claim.claimedValue && value.lineageComplete === true &&
        validDigest(value.documentDigest) && Array.isArray(value.upstreamDigests) && value.upstreamDigests.every(validDigest) && new Set(value.upstreamDigests).size === value.upstreamDigests.length && JSON.stringify(value.upstreamDigests) === JSON.stringify([...value.upstreamDigests].sort()) &&
        source.controllerId === value.sourceControllerId && source.failureDomain === value.sourceFailureDomain && !status.current?.revokedSourceKeyDigests.includes(source.keyDigest) &&
        verify(null, Buffer.from(JSON.stringify(evidenceBody(value))), createPublicKey(source.publicKeyPem), Buffer.from(value.signatureBase64 ?? "", "base64"));
    });
    return { issuerId: issuer.issuerId, dimension, valid: Boolean(profile?.[dimension]) && claim?.claimedValue === profile?.[dimension] && rootsValid && open.length === 0 };
  }));
  const parent = profiles.map((_, index) => index);
  const find = index => parent[index] === index ? index : (parent[index] = find(parent[index]));
  const union = (left, right) => { const a = find(left), b = find(right); if (a !== b) parent[b] = a; };
  for (let left = 0; left < profiles.length; left++) for (let right = left + 1; right < profiles.length; right++) {
    if (dimensions.some(dimension => profiles[left][dimension] === profiles[right][dimension])) union(left, right);
  }
  const effectiveCenters = new Set(profiles.map((_, index) => find(index))).size;
  const allRoots = claims.flatMap(value => value.evidenceRoots ?? []);
  const lineage = allRoots.flatMap(value => [value.documentDigest, ...(value.upstreamDigests ?? [])]);
  const sourceBody = sourceRegistry && { schema: sourceRegistry.schema, statusAuthorityKeyDigest: sourceRegistry.statusAuthorityKeyDigest, sources: sourceRegistry.sources };
  const sourceRegistryValid = sourceRegistry?.schema === "cct-control-evidence-source-registry/v1" && sourceRegistry.stateDigest === digest(JSON.stringify(sourceBody)) && sourceRegistry.sources.every(source => {
    try { return digest(createPublicKey(source.publicKeyPem).export({ type: "spki", format: "der" })) === source.keyDigest; } catch { return false; }
  });
  const counts = lineage.reduce((map, value) => map.set(value, (map.get(value) ?? 0) + 1), new Map());
  const sharedLineageDigests = [...counts].filter(([, count]) => count > 1).map(([value]) => value).sort();
  const independentLineage = lineage.length > 0 && sharedLineageDigests.length === 0;
  return { ok: exactCoverage && audits.every(value => value.valid) && effectiveCenters === 4 && sourceRegistryValid && status.ok && independentLineage && equivocationInventoryComplete && policyEquivocationInventoryComplete && !authoritySuspended, exactCoverage, allDimensionsCorroborated: audits.every(value => value.valid), sourceRegistryValid, sourceStatusHistoryValid: status.ok, sourceStatusGeneration: status.current?.generation ?? null, equivocationInventoryComplete, policyEquivocationInventoryComplete, policyResolutionEffectObserved, policyResolutionFresh, policyResolutionApplied, recoveryPolicyHistoryValid: policySelections.every(value => value.ok), recoveryPolicyEquivocationDigests: detectedPolicyEquivocationDigests, recoveryApplied, competingRecoveries, authoritySuspended, equivocationEvidenceDigests: detectedEquivocationDigests, independentLineage, sharedLineageDigests, effectiveCenters, audits };
};
