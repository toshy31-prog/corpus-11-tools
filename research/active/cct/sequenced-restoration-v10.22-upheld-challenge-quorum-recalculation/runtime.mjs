import { readFileSync } from "node:fs";
import { assessIndependentChallengeAdjudication } from "../sequenced-restoration-v10.21-independent-challenge-adjudication/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

function effectiveCenterCount(profiles) {
  const parent = profiles.map((_, index) => index);
  const find = (x) => parent[x] === x ? x : (parent[x] = find(parent[x]));
  const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent[rb] = ra; };
  for (let i = 0; i < profiles.length; i++) for (let j = i + 1; j < profiles.length; j++) {
    if (SPEC.controlDimensions.some((field) => profiles[i][field] === profiles[j][field])) union(i, j);
  }
  return new Set(profiles.map((_, index) => find(index))).size;
}

export function assessUpheldChallengeQuorumRecalculation(args) {
  const prior = assessIndependentChallengeAdjudication(args);
  if (prior.status !== "independent_challenge_adjudication_candidate") return prior;
  const revisedProfiles = structuredClone(args.authorityControlProfiles);
  const appliedChallenges = [];
  for (const audit of prior.challengeAudits.filter((item) => item.verdict === "challenge_upheld")) {
    const challenge = args.controlChallenges.find((item) => item.challengeId === audit.challengeId);
    const profile = revisedProfiles.find((item) => item.authorityDomain === challenge.authorityDomain);
    if (!profile || !SPEC.controlDimensions.includes(challenge.dimension)) return { status: "not_established", failures: ["upheld_challenge_target_invalid"] };
    profile[challenge.dimension] = challenge.contraryValue;
    appliedChallenges.push(challenge.challengeId);
  }
  const effectiveCentersAfterAdjudication = effectiveCenterCount(revisedProfiles);
  const authorityQuorumEligible = effectiveCentersAfterAdjudication >= SPEC.minimumEffectiveCenters;
  return {
    ...prior,
    status: SPEC.successStatus,
    evidenceLevel: "adjudicated_profile_mutation_and_quorum_recalculation",
    revisedProfiles,
    appliedChallenges,
    effectiveCentersAfterAdjudication,
    authorityQuorumEligible,
    requiredAction: authorityQuorumEligible ? "retain_candidate_quorum" : "suspend_authority_quorum",
    institutionalSuspensionEstablished: false,
    notEstablished: SPEC.notEstablished,
  };
}
