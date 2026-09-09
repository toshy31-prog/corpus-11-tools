import assert from "node:assert/strict";
import { assessUpheldChallengeQuorumRecalculation } from "../runtime.mjs";
import { fullSetup } from "../fixtures.mjs";

const result = assessUpheldChallengeQuorumRecalculation(fullSetup());
assert.equal(result.revisedProfiles[0].effectiveOwnerId, result.revisedProfiles[1].effectiveOwnerId);
assert.equal(result.authorityQuorumEligible, false);
assert.equal(result.requiredAction, "suspend_authority_quorum");
console.log(JSON.stringify({ ok: true, effectiveCenters: result.effectiveCentersAfterAdjudication, requiredAction: result.requiredAction }));
