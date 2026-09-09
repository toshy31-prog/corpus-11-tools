import { createHash, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { assessContestableControlCorroboration } from "../sequenced-restoration-v10.20-contestable-control-corroboration/runtime.mjs";

const SPEC = JSON.parse(readFileSync(new URL("./spec.json", import.meta.url)));
const hash = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const challengePayload = (item) => JSON.stringify({ challengeId: item.challengeId, authorityDomain: item.authorityDomain, dimension: item.dimension, contraryValue: item.contraryValue });
const payload = (item) => JSON.stringify({ challengeId: item.challengeId, challengeHash: item.challengeHash, verdict: item.verdict, reasonArtifactHash: item.reasonArtifactHash, issuedAt: item.issuedAt, adjudicatorId: item.adjudicatorId });

export function assessIndependentChallengeAdjudication(args) {
  const prior = assessContestableControlCorroboration({ ...args, controlChallenges: [] });
  if (prior.status !== "contestable_control_corroboration_candidate") return prior;
  const registry = new Map((args.adjudicatorRegistry ?? []).map((item) => [item.adjudicatorId, item]));
  const challengeAudits = (args.controlChallenges ?? []).map((challenge) => {
    const challengedProfile = args.authorityControlProfiles.find((item) => item.authorityDomain === challenge.authorityDomain);
    const challengedRoots = new Set(Object.values(challengedProfile ?? {}).filter((value) => typeof value === "string"));
    const decisions = (args.adjudicationDecisions ?? []).filter((item) => item.challengeId === challenge.challengeId);
    const decisionAudits = decisions.map((decision) => {
      const judge = registry.get(decision.adjudicatorId);
      const failures = [];
      if (decision.challengeHash !== hash(challengePayload(challenge))) failures.push("adjudication_challenge_hash_mismatch");
      if (!judge) failures.push("unregistered_adjudicator");
      else {
        if ((judge.controlRootIds ?? []).some((root) => challengedRoots.has(root))) failures.push("adjudicator_shares_challenged_control_root");
        if (!verify(null, Buffer.from(payload(decision)), judge.publicKeyPem, Buffer.from(decision.signatureBase64, "base64"))) failures.push("invalid_adjudication_signature");
      }
      if (decision.reasonArtifactHash !== hash(decision.reason ?? "")) failures.push("adjudication_reason_hash_mismatch");
      return { adjudicatorId: decision.adjudicatorId, centerId: judge?.centerId, verdict: decision.verdict, failures };
    });
    const valid = decisionAudits.filter((item) => item.failures.length === 0);
    const centers = new Set(valid.map((item) => item.centerId));
    const verdicts = new Set(valid.map((item) => item.verdict));
    const resolved = centers.size >= SPEC.minimumAdjudicationCenters && verdicts.size === 1;
    return { challengeId: challenge.challengeId, resolved, verdict: resolved ? [...verdicts][0] : null, decisionAudits };
  });
  const allChallengesResolved = challengeAudits.every((item) => item.resolved);
  if (!allChallengesResolved) return { status: "not_established", failures: ["challenge_adjudication_unresolved"], challengeAudits };
  const separationReopened = challengeAudits.every((item) => item.verdict === "challenge_rejected");
  return { ...prior, status: SPEC.successStatus, evidenceLevel: "signed_independent_center_adjudication", challengeAudits, allChallengesResolved, separationReopened, adjudicatorLegitimacyEstablished: false, notEstablished: SPEC.notEstablished };
}
