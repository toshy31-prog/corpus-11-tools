import { createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";

const [sourceRegistryPath, rootsPath, adjudicatorRegistryPath, resolutionsPath, corroborationPath, decisionLedgerPath, repairRegistryPath, repairsPath] = process.argv.slice(2);
if (!repairsPath) { process.stderr.write("usage: node verify-lineage-resolution.mjs SOURCE_REGISTRY ROOTS ADJUDICATOR_REGISTRY RESOLUTIONS CORROBORATION DECISION_LEDGER REPAIR_REGISTRY REPAIRS\n"); process.exit(2); }
const sources = new Map(JSON.parse(readFileSync(sourceRegistryPath, "utf8")).sources.map(item => [item.sourceId, item]));
const roots = new Map(JSON.parse(readFileSync(rootsPath, "utf8")).map(item => [item.rootId, item]));
const adjudicators = new Map(JSON.parse(readFileSync(adjudicatorRegistryPath, "utf8")).adjudicators.map(item => [item.adjudicatorId, item]));
const resolutions = JSON.parse(readFileSync(resolutionsPath, "utf8"));
const claims = JSON.parse(readFileSync(corroborationPath, "utf8"));
const decisions = JSON.parse(readFileSync(decisionLedgerPath, "utf8"));
const repairAuthorities = new Map(JSON.parse(readFileSync(repairRegistryPath, "utf8")).authorities.map(item => [item.authorityId, item]));
const repairs = JSON.parse(readFileSync(repairsPath, "utf8"));
const hex = value => typeof value === "string" && /^sha256:[0-9a-f]{64}$/.test(value);
const validRoot = root => {
  const source = sources.get(root?.sourceId);
  const body = root && { schema: root.schema, rootId: root.rootId, sourceId: root.sourceId, holderId: root.holderId, dimension: root.dimension, claimedValue: root.claimedValue, documentDigest: root.documentDigest, upstreamEvidenceDigests: root.upstreamEvidenceDigests, lineageComplete: root.lineageComplete };
  return Boolean(source && root.lineageComplete && Array.isArray(root.upstreamEvidenceDigests) && verify(null, Buffer.from(JSON.stringify(body)), createPublicKey(source.publicKeyPem), Buffer.from(root.signatureBase64, "base64")));
};
const groups = new Map();
for (const resolution of resolutions) {
  const adjudicator = adjudicators.get(resolution.adjudicatorId);
  const body = { schema: resolution.schema, resolutionId: resolution.resolutionId, adjudicatorId: resolution.adjudicatorId, oldRootId: resolution.oldRootId, newRootId: resolution.newRootId, omittedEvidenceDigest: resolution.omittedEvidenceDigest, verdict: resolution.verdict, evidenceArtifactDigest: resolution.evidenceArtifactDigest, challengeOpenedAtTick: resolution.challengeOpenedAtTick, resolvedAtTick: resolution.resolvedAtTick, effectiveFromTick: resolution.effectiveFromTick };
  const timingValid = Number.isSafeInteger(resolution.challengeOpenedAtTick) && Number.isSafeInteger(resolution.resolvedAtTick) && Number.isSafeInteger(resolution.effectiveFromTick) && resolution.challengeOpenedAtTick < resolution.resolvedAtTick && resolution.resolvedAtTick <= resolution.effectiveFromTick;
  const valid = Boolean(adjudicator) && resolution.schema === "cct-lineage-resolution-attestation/v1" && resolution.verdict === "omission_incorporated" && timingValid && verify(null, Buffer.from(JSON.stringify(body)), createPublicKey(adjudicator.publicKeyPem), Buffer.from(resolution.signatureBase64, "base64"));
  if (valid) { const key = JSON.stringify([resolution.oldRootId, resolution.newRootId, resolution.omittedEvidenceDigest, resolution.challengeOpenedAtTick, resolution.resolvedAtTick, resolution.effectiveFromTick]); groups.set(key, [...(groups.get(key) ?? []), { resolution, adjudicator }]); }
}
const established = [...groups.values()].flatMap(group => {
  const sample = group[0].resolution, oldRoot = roots.get(sample.oldRootId), newRoot = roots.get(sample.newRootId);
  const claimUpdated = claims.some(claim => claim.holderId === newRoot?.holderId && claim.dimension === newRoot?.dimension && claim.evidenceRoots?.includes(newRoot.rootId) && !claim.evidenceRoots.includes(oldRoot?.rootId));
  const incorporated = oldRoot && newRoot && oldRoot.sourceId === newRoot.sourceId && oldRoot.holderId === newRoot.holderId && oldRoot.dimension === newRoot.dimension && oldRoot.claimedValue === newRoot.claimedValue && newRoot.upstreamEvidenceDigests.includes(sample.omittedEvidenceDigest);
  const quorum = new Set(group.map(item => item.resolution.adjudicatorId)).size >= 2 && new Set(group.map(item => item.adjudicator.controller)).size >= 2 && new Set(group.map(item => item.adjudicator.failureDomain)).size >= 2 && new Set(group.map(item => item.resolution.evidenceArtifactDigest)).size >= 2;
  return validRoot(newRoot) && incorporated && claimUpdated && quorum ? [{ oldRootId: oldRoot.rootId, newRootId: newRoot.rootId, omittedEvidenceDigest: sample.omittedEvidenceDigest, resolutionIds: group.map(item => item.resolution.resolutionId) }] : [];
});
const invalidDecisionIds = [...groups.values()].flatMap(group => {
  const resolution = group[0].resolution;
  return decisions.filter(decision => (decision.rootId === resolution.oldRootId && decision.decidedAtTick >= resolution.challengeOpenedAtTick) || (decision.rootId === resolution.newRootId && decision.decidedAtTick < resolution.effectiveFromTick)).map(decision => decision.decisionId);
});
const historicalInvalidDecisionIds = [...new Set(invalidDecisionIds)];
const repairGroups = new Map();
for (const repair of repairs) {
  const authority = repairAuthorities.get(repair.authorityId);
  const body = { schema: repair.schema, repairId: repair.repairId, authorityId: repair.authorityId, decisionId: repair.decisionId, action: repair.action, replacementDecisionId: repair.replacementDecisionId, newRootId: repair.newRootId, repairedAtTick: repair.repairedAtTick, consequenceAssessmentDigest: repair.consequenceAssessmentDigest, affectedPartyNoticeDigest: repair.affectedPartyNoticeDigest, evidenceArtifactDigest: repair.evidenceArtifactDigest };
  const valid = Boolean(authority) && repair.schema === "cct-invalid-decision-repair/v1" && ["voided", "reevaluated"].includes(repair.action) && Number.isSafeInteger(repair.repairedAtTick) && [repair.consequenceAssessmentDigest, repair.affectedPartyNoticeDigest, repair.evidenceArtifactDigest].every(hex) && verify(null, Buffer.from(JSON.stringify(body)), createPublicKey(authority.publicKeyPem), Buffer.from(repair.signatureBase64, "base64"));
  if (valid) { const key = JSON.stringify([repair.decisionId, repair.action, repair.replacementDecisionId, repair.newRootId, repair.repairedAtTick, repair.consequenceAssessmentDigest, repair.affectedPartyNoticeDigest]); repairGroups.set(key, [...(repairGroups.get(key) ?? []), { repair, authority }]); }
}
const repairedDecisionIds = historicalInvalidDecisionIds.filter(decisionId => [...repairGroups.values()].some(group => {
  const sample = group[0].repair;
  const resolution = [...groups.values()].flat().map(item => item.resolution).find(item => item.oldRootId === decisions.find(decision => decision.decisionId === decisionId)?.rootId);
  const replacementValid = sample.action === "voided" || decisions.some(decision => decision.decisionId === sample.replacementDecisionId && decision.rootId === resolution?.newRootId && decision.decidedAtTick >= resolution.effectiveFromTick);
  return sample.decisionId === decisionId && sample.newRootId === resolution?.newRootId && sample.repairedAtTick >= resolution.effectiveFromTick && replacementValid && new Set(group.map(item => item.repair.authorityId)).size >= 2 && new Set(group.map(item => item.authority.controller)).size >= 2 && new Set(group.map(item => item.authority.failureDomain)).size >= 2 && new Set(group.map(item => item.repair.evidenceArtifactDigest)).size >= 2;
}));
const unrepairedDecisionIds = historicalInvalidDecisionIds.filter(id => !repairedDecisionIds.includes(id));
const repairComplete = unrepairedDecisionIds.length === 0;
const ok = established.length > 0 && repairComplete;
process.stdout.write(`${JSON.stringify({ ok, resolutionsEstablished: established, historicalInvalidDecisionIds, repairedDecisionIds, unrepairedDecisionIds, repairComplete })}\n`);
if (!ok) process.exitCode = 1;
