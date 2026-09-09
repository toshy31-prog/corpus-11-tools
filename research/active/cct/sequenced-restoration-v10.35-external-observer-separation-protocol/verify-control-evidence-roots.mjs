import { createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";

const [sourceRegistryPath, attestationsPath, corroborationPath] = process.argv.slice(2);
if (!corroborationPath) {
  process.stderr.write("usage: node verify-control-evidence-roots.mjs SOURCE_REGISTRY ATTESTATIONS CORROBORATION\n");
  process.exit(2);
}
const registry = JSON.parse(readFileSync(sourceRegistryPath, "utf8"));
const attestations = JSON.parse(readFileSync(attestationsPath, "utf8"));
const claims = JSON.parse(readFileSync(corroborationPath, "utf8"));
const sources = new Map(registry.sources?.map(source => [source.sourceId, source]) ?? []);
const hexDigest = value => typeof value === "string" && /^sha256:[0-9a-f]{64}$/.test(value);
const valid = attestations.map(attestation => {
  const source = sources.get(attestation.sourceId);
  const body = { schema: attestation.schema, rootId: attestation.rootId, sourceId: attestation.sourceId, holderId: attestation.holderId, dimension: attestation.dimension, claimedValue: attestation.claimedValue, documentDigest: attestation.documentDigest, upstreamEvidenceDigests: attestation.upstreamEvidenceDigests, lineageComplete: attestation.lineageComplete };
  const lineageOrderedUnique = Array.isArray(attestation.upstreamEvidenceDigests) && JSON.stringify(attestation.upstreamEvidenceDigests) === JSON.stringify([...new Set(attestation.upstreamEvidenceDigests)].sort());
  const checks = {
    sourceRegistered: Boolean(source),
    schema: attestation.schema === "cct-control-evidence-root-attestation/v1",
    documentDigest: hexDigest(attestation.documentDigest),
    lineageDigests: lineageOrderedUnique && attestation.upstreamEvidenceDigests.every(hexDigest),
    lineageComplete: attestation.lineageComplete === true,
    signature: Boolean(source) && verify(null, Buffer.from(JSON.stringify(body)), createPublicKey(source.publicKeyPem), Buffer.from(attestation.signatureBase64, "base64")),
  };
  return { ...attestation, source, valid: Object.values(checks).every(Boolean), checks };
});
const rootIdsUnique = new Set(attestations.map(item => item.rootId)).size === attestations.length;
const claimAudits = claims.map(claim => {
  const roots = valid.filter(item => (claim.evidenceRoots ?? []).includes(item.rootId));
  const exactRoots = roots.length === new Set(claim.evidenceRoots ?? []).size && roots.every(root => root.holderId === claim.holderId && root.dimension === claim.dimension && root.claimedValue === claim.claimedValue);
  const lineages = roots.map(root => new Set([root.documentDigest, ...(root.upstreamEvidenceDigests ?? [])]));
  const sharedLineageDigests = lineages.length < 2 ? [] : [...lineages[0]].filter(item => lineages.slice(1).some(lineage => lineage.has(item)));
  return {
    holderId: claim.holderId,
    dimension: claim.dimension,
    exactRoots,
    validRoots: roots.filter(root => root.valid).length,
    distinctSources: new Set(roots.map(root => root.sourceId)).size,
    distinctControllers: new Set(roots.map(root => root.source?.controller)).size,
    distinctFailureDomains: new Set(roots.map(root => root.source?.failureDomain)).size,
    sharedLineageDigests,
    admitted: exactRoots && roots.length >= 2 && roots.every(root => root.valid) && new Set(roots.map(root => root.sourceId)).size >= 2 && new Set(roots.map(root => root.source?.controller)).size >= 2 && new Set(roots.map(root => root.source?.failureDomain)).size >= 2 && sharedLineageDigests.length === 0,
  };
});
const ok = registry.schema === "cct-control-evidence-source-registry/v1" && rootIdsUnique && valid.every(item => item.valid) && claimAudits.length === claims.length && claimAudits.every(audit => audit.admitted);
process.stdout.write(`${JSON.stringify({ ok, rootIdsUnique, registeredSources: sources.size, claimAudits })}\n`);
if (!ok) process.exitCode = 1;
