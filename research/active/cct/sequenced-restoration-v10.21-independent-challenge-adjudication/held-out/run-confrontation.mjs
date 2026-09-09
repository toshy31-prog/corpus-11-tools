import assert from "node:assert/strict";
import { assessIndependentChallengeAdjudication } from "../runtime.mjs";
import { fullSetup } from "../fixtures.mjs";

const setup = fullSetup();
setup.adjudicatorRegistry[0].controlRootIds = [setup.authorityControlProfiles[0].effectiveOwnerId];
const result = assessIndependentChallengeAdjudication(setup);
assert.deepEqual(result.failures, ["challenge_adjudication_unresolved"]);
assert.ok(result.challengeAudits[0].decisionAudits[0].failures.includes("adjudicator_shares_challenged_control_root"));
console.log(JSON.stringify({ ok: true, failure: result.failures[0], selfJudgmentBlocked: true }));
