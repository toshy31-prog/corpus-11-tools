import { readFileSync } from "node:fs";

const [holderRegistryPath, profilesPath, corroborationPath, challengesPath] = process.argv.slice(2);
if (!challengesPath) {
  process.stderr.write("usage: node verify-custody-control.mjs HOLDER_REGISTRY PROFILES CORROBORATION CHALLENGES\n");
  process.exit(2);
}
const registry = JSON.parse(readFileSync(holderRegistryPath, "utf8"));
const profiles = JSON.parse(readFileSync(profilesPath, "utf8"));
const corroboration = JSON.parse(readFileSync(corroborationPath, "utf8"));
const challenges = JSON.parse(readFileSync(challengesPath, "utf8"));
const dimensions = ["effectiveOwnerId", "keyOperatorId", "decisiveFunderId", "vetoControllerId"];
const expected = registry.holders?.map(holder => holder.holderId) ?? [];
const profileMap = new Map(profiles.map(profile => [profile.holderId, profile]));
const profileCoverage = profileMap.size === profiles.length && expected.length === profiles.length && expected.every(holderId => profileMap.has(holderId));
const audits = expected.flatMap(holderId => dimensions.map(dimension => {
  const profile = profileMap.get(holderId);
  const claim = corroboration.find(item => item.holderId === holderId && item.dimension === dimension);
  const openChallenges = challenges.filter(item => item.holderId === holderId && item.dimension === dimension && item.status !== "resolved");
  const failures = [];
  if (!profile?.[dimension]) failures.push("control_value_unknown");
  if (!claim) failures.push("corroboration_missing");
  else {
    if (claim.claimedValue !== profile?.[dimension]) failures.push("corroborated_value_mismatch");
    if (new Set(claim.evidenceRoots ?? []).size < 2) failures.push("independent_evidence_roots_missing");
  }
  if (openChallenges.length) failures.push("unresolved_material_challenge");
  return { holderId, dimension, failures, challengeIds: openChallenges.map(item => item.challengeId) };
}));
const parent = profiles.map((_, index) => index);
const find = index => parent[index] === index ? index : (parent[index] = find(parent[index]));
const union = (left, right) => { const a = find(left), b = find(right); if (a !== b) parent[b] = a; };
const sharedControls = [];
for (let left = 0; left < profiles.length; left++) for (let right = left + 1; right < profiles.length; right++) {
  const shared = dimensions.filter(dimension => profiles[left][dimension] && profiles[left][dimension] === profiles[right][dimension]);
  if (shared.length) { union(left, right); sharedControls.push({ holders: [profiles[left].holderId, profiles[right].holderId], dimensions: shared }); }
}
const effectiveCenters = new Set(profiles.map((_, index) => find(index))).size;
const checks = {
  registrySchema: registry.schema === "cct-custody-holder-registry/v1",
  profileCoverage,
  allClaimsCorroborated: audits.every(audit => audit.failures.length === 0),
  minimumEffectiveCenters: effectiveCenters >= 2,
};
const ok = Object.values(checks).every(Boolean);
process.stdout.write(`${JSON.stringify({ ok, checks, effectiveCenters, sharedControls, audits, realWorldIndependenceEstablished: false })}\n`);
if (!ok) process.exitCode = 1;
