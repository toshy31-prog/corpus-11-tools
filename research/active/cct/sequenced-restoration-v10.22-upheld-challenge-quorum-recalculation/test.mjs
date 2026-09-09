import test from "node:test";
import assert from "node:assert/strict";
import { assessUpheldChallengeQuorumRecalculation } from "./runtime.mjs";
import { fullSetup } from "./fixtures.mjs";

test("applies an upheld ownership challenge and withdraws the collapsed quorum", () => {
  const result = assessUpheldChallengeQuorumRecalculation(fullSetup());
  assert.equal(result.status, "upheld_challenge_quorum_recalculation_candidate");
  assert.deepEqual(result.appliedChallenges, ["challenge-1"]);
  assert.equal(result.effectiveCentersAfterAdjudication, 1);
  assert.equal(result.authorityQuorumEligible, false);
  assert.equal(result.requiredAction, "suspend_authority_quorum");
  assert.equal(result.institutionalSuspensionEstablished, false);
});

test("a rejected challenge does not mutate the profiles", async () => {
  const setup = fullSetup();
  const { signedDecisions } = await import("../sequenced-restoration-v10.21-independent-challenge-adjudication/fixtures.mjs");
  setup.adjudicationDecisions = signedDecisions(setup.controlChallenges[0], "challenge_rejected");
  const result = assessUpheldChallengeQuorumRecalculation(setup);
  assert.deepEqual(result.appliedChallenges, []);
  assert.equal(result.effectiveCentersAfterAdjudication, 2);
  assert.equal(result.authorityQuorumEligible, true);
});
