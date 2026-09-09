import { readFileSync } from "node:fs";
import { assessEffectiveAuthorityCenterSeparation } from "../sequenced-restoration-v10.19-effective-authority-center-separation/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));

export function assessContestableControlCorroboration(args) {
  const prior = assessEffectiveAuthorityCenterSeparation(args);
  if (prior.status !== "effective_authority_center_separation_candidate") return prior;
  const register = args.controlCorroborationRegister ?? [];
  const challenges = args.controlChallenges ?? [];
  const claimAudits = args.authorityControlProfiles.flatMap((profile) => SPEC.controlDimensions.map((dimension) => {
    const claim = register.find((item) => item.authorityDomain === profile.authorityDomain && item.dimension === dimension);
    const failures = [];
    if (!claim) failures.push("missing_control_corroboration");
    else {
      if (claim.claimedValue !== profile[dimension]) failures.push("corroborated_value_mismatch");
      if (new Set(claim.evidenceRoots ?? []).size < SPEC.minimumIndependentEvidenceRoots) failures.push("insufficient_independent_evidence_roots");
    }
    const unresolvedChallenges = challenges.filter((item) => item.authorityDomain === profile.authorityDomain && item.dimension === dimension);
    if (unresolvedChallenges.length) failures.push("unresolved_material_control_challenge");
    return { authorityDomain: profile.authorityDomain, dimension, failures, unresolvedChallengeIds: unresolvedChallenges.map((item) => item.challengeId) };
  }));
  const allClaimsCorroborated = claimAudits.every((item) => item.failures.length === 0);
  if (!allClaimsCorroborated) return { status: "not_established", failures: ["control_separation_not_corroborated_or_contested"], claimAudits };
  return {
    ...prior,
    status: SPEC.successStatus,
    evidenceLevel: "multi_root_contestable_control_claims",
    allClaimsCorroborated,
    separationChallengeOpen: false,
    claimTruthEstablished: false,
    notEstablished: SPEC.notEstablished,
  };
}
