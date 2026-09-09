import { createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";

const [challengerRegistryPath, challengesPath, attestationsPath] = process.argv.slice(2);
if (!attestationsPath) { process.stderr.write("usage: node verify-lineage-challenges.mjs CHALLENGER_REGISTRY CHALLENGES ROOT_ATTESTATIONS\n"); process.exit(2); }
const registry = JSON.parse(readFileSync(challengerRegistryPath, "utf8"));
const challenges = JSON.parse(readFileSync(challengesPath, "utf8"));
const roots = new Map(JSON.parse(readFileSync(attestationsPath, "utf8")).map(root => [root.rootId, root]));
const challengers = new Map(registry.challengers?.map(item => [item.challengerId, item]) ?? []);
const hex = value => typeof value === "string" && /^sha256:[0-9a-f]{64}$/.test(value);
const rows = challenges.map(challenge => {
  const challenger = challengers.get(challenge.challengerId);
  const body = { schema: challenge.schema, challengeId: challenge.challengeId, challengerId: challenge.challengerId, rootId: challenge.rootId, omittedEvidenceDigest: challenge.omittedEvidenceDigest, evidenceArtifactDigest: challenge.evidenceArtifactDigest, status: challenge.status };
  const valid = Boolean(challenger) && challenge.schema === "cct-lineage-omission-challenge/v1" && roots.has(challenge.rootId) && hex(challenge.omittedEvidenceDigest) && hex(challenge.evidenceArtifactDigest) && challenge.status === "open" && verify(null, Buffer.from(JSON.stringify(body)), createPublicKey(challenger.publicKeyPem), Buffer.from(challenge.signatureBase64, "base64"));
  return { ...challenge, challenger, valid };
});
const challengedRoots = [...roots.keys()].flatMap(rootId => {
  const groups = new Map();
  for (const vote of rows.filter(row => row.valid && row.rootId === rootId)) groups.set(vote.omittedEvidenceDigest, [...(groups.get(vote.omittedEvidenceDigest) ?? []), vote]);
  return [...groups].flatMap(([omittedEvidenceDigest, group]) => {
    const quorum = new Set(group.map(vote => vote.challengerId)).size >= 2 && new Set(group.map(vote => vote.challenger?.controller)).size >= 2 && new Set(group.map(vote => vote.challenger?.failureDomain)).size >= 2 && new Set(group.map(vote => vote.evidenceArtifactDigest)).size >= 2;
    return quorum ? [{ rootId, omittedEvidenceDigest, challengeIds: group.map(vote => vote.challengeId) }] : [];
  });
});
const invalidChallengeIds = rows.filter(row => !row.valid).map(row => row.challengeId);
const lineageAdmissionSuspended = challengedRoots.length > 0;
process.stdout.write(`${JSON.stringify({ ok: invalidChallengeIds.length === 0 && !lineageAdmissionSuspended, lineageAdmissionSuspended, challengedRoots, invalidChallengeIds })}\n`);
if (invalidChallengeIds.length) process.exitCode = 2;
else if (lineageAdmissionSuspended) process.exitCode = 1;
