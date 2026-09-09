import test from "node:test";
import assert from "node:assert/strict";
import { assessContestableControlCorroboration } from "./runtime.mjs";
import { fullSetup } from "./fixtures.mjs";

test("requires two documentary roots for every effective-control claim", () => {
  const result = assessContestableControlCorroboration(fullSetup());
  assert.equal(result.status, "contestable_control_corroboration_candidate");
  assert.equal(result.allClaimsCorroborated, true);
  assert.equal(result.claimTruthEstablished, false);
});

test("two copies of the same root do not corroborate a claim", () => {
  const setup = fullSetup();
  setup.controlCorroborationRegister[0].evidenceRoots[1] = setup.controlCorroborationRegister[0].evidenceRoots[0];
  const result = assessContestableControlCorroboration(setup);
  assert.deepEqual(result.failures, ["control_separation_not_corroborated_or_contested"]);
  assert.ok(result.claimAudits[0].failures.includes("insufficient_independent_evidence_roots"));
});

test("an unresolved material challenge suspends the separation claim", () => {
  const setup = fullSetup();
  setup.controlChallenges.push({ challengeId: "challenge-1", authorityDomain: setup.authorityControlProfiles[0].authorityDomain, dimension: "effectiveOwnerId", status: "open", contraryValue: "shared-owner" });
  const result = assessContestableControlCorroboration(setup);
  assert.ok(result.claimAudits[0].failures.includes("unresolved_material_control_challenge"));
});
