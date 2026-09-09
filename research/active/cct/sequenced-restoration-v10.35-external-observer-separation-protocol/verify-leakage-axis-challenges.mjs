import { createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";

const [axisRegistryPath, challengerRegistryPath, challengesPath] = process.argv.slice(2);
if (!challengesPath) { process.stderr.write("usage: node verify-leakage-axis-challenges.mjs AXIS_REGISTRY CHALLENGER_REGISTRY CHALLENGES\n"); process.exit(2); }
const axes = JSON.parse(readFileSync(axisRegistryPath, "utf8"));
const challengers = new Map(JSON.parse(readFileSync(challengerRegistryPath, "utf8")).challengers.map(item => [item.challengerId, item]));
const challenges = JSON.parse(readFileSync(challengesPath, "utf8"));
const digestPattern = /^sha256:[0-9a-f]{64}$/;
const rows = challenges.map(challenge => {
  const challenger = challengers.get(challenge.challengerId);
  const body = { schema: challenge.schema, challengeId: challenge.challengeId, challengerId: challenge.challengerId, kind: challenge.kind, axisName: challenge.axisName, proposedValue: challenge.proposedValue, proposedAxisName: challenge.proposedAxisName, seedValues: challenge.seedValues, evidenceArtifactDigest: challenge.evidenceArtifactDigest };
  const omittedValue = challenge.kind === "omitted_value" && Array.isArray(axes.axes?.[challenge.axisName]) && typeof challenge.proposedValue === "string" && !axes.axes[challenge.axisName].includes(challenge.proposedValue);
  const omittedAxis = challenge.kind === "omitted_axis" && typeof challenge.proposedAxisName === "string" && !Object.hasOwn(axes.axes ?? {}, challenge.proposedAxisName) && Array.isArray(challenge.seedValues) && challenge.seedValues.length > 0 && new Set(challenge.seedValues).size === challenge.seedValues.length;
  const valid = Boolean(challenger) && challenge.schema === "cct-leakage-axis-omission-challenge/v1" && (omittedValue || omittedAxis) && digestPattern.test(challenge.evidenceArtifactDigest ?? "") && verify(null, Buffer.from(JSON.stringify(body)), createPublicKey(challenger.publicKeyPem), Buffer.from(challenge.signatureBase64, "base64"));
  const proposal = omittedValue ? { kind: challenge.kind, axisName: challenge.axisName, proposedValue: challenge.proposedValue } : { kind: challenge.kind, proposedAxisName: challenge.proposedAxisName, seedValues: challenge.seedValues };
  return { challenge, challenger, proposal, valid };
});
const groups = new Map();
for (const row of rows.filter(row => row.valid)) { const key = JSON.stringify(row.proposal); groups.set(key, [...(groups.get(key) ?? []), row]); }
const upheld = [...groups.values()].flatMap(group => {
  const quorum = new Set(group.map(row => row.challenge.challengerId)).size >= 2 && new Set(group.map(row => row.challenger.controller)).size >= 2 && new Set(group.map(row => row.challenger.failureDomain)).size >= 2 && new Set(group.map(row => row.challenge.evidenceArtifactDigest)).size >= 2;
  return quorum ? [{ proposal: group[0].proposal, challengeIds: group.map(row => row.challenge.challengeId) }] : [];
});
const invalidChallengeIds = rows.filter(row => !row.valid).map(row => row.challenge.challengeId);
const coverageSuspended = upheld.length > 0;
process.stdout.write(`${JSON.stringify({ ok: invalidChallengeIds.length === 0 && !coverageSuspended, coverageSuspended, upheld, invalidChallengeIds, registryAutomaticallyAmended: false })}\n`);
if (invalidChallengeIds.length) process.exitCode = 2;
else if (coverageSuspended) process.exitCode = 1;
