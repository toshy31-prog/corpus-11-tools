import test from "node:test";
import assert from "node:assert/strict";
import { assessIndependentChallengeAdjudication } from "./runtime.mjs";
import { fullSetup, signedDecisions } from "./fixtures.mjs";

test("reopens separation only after two concordant signed decisions", () => {
  const result = assessIndependentChallengeAdjudication(fullSetup());
  assert.equal(result.status, "independent_challenge_adjudication_candidate");
  assert.equal(result.allChallengesResolved, true);
  assert.equal(result.separationReopened, true);
  assert.equal(result.adjudicatorLegitimacyEstablished, false);
});

test("one adjudication center cannot close a challenge", () => {
  const setup = fullSetup();
  setup.adjudicationDecisions.pop();
  const result = assessIndependentChallengeAdjudication(setup);
  assert.deepEqual(result.failures, ["challenge_adjudication_unresolved"]);
});

test("disagreement keeps the challenge unresolved", () => {
  const setup = fullSetup();
  setup.adjudicationDecisions = [
    signedDecisions(setup.controlChallenges[0], "challenge_rejected")[0],
    signedDecisions(setup.controlChallenges[0], "challenge_upheld")[1],
  ];
  const result = assessIndependentChallengeAdjudication(setup);
  assert.deepEqual(result.failures, ["challenge_adjudication_unresolved"]);
});

test("changing the challenged value after signature invalidates adjudication", () => {
  const setup = fullSetup();
  setup.controlChallenges[0].contraryValue = "different-shared-owner";
  const result = assessIndependentChallengeAdjudication(setup);
  assert.deepEqual(result.failures, ["challenge_adjudication_unresolved"]);
  assert.ok(result.challengeAudits[0].decisionAudits.every((item) => item.failures.includes("adjudication_challenge_hash_mismatch")));
});
