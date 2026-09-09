import assert from "node:assert/strict";
import { assessContestableControlCorroboration } from "../runtime.mjs";
import { fullSetup } from "../fixtures.mjs";

const setup = fullSetup();
setup.controlChallenges.push({ challengeId: "held-out-veto-link", authorityDomain: setup.authorityControlProfiles[1].authorityDomain, dimension: "vetoControllerId", status: "deadline_elapsed", contraryValue: setup.authorityControlProfiles[0].vetoControllerId });
const result = assessContestableControlCorroboration(setup);
assert.deepEqual(result.failures, ["control_separation_not_corroborated_or_contested"]);
const audit = result.claimAudits.find((item) => item.dimension === "vetoControllerId" && item.authorityDomain === setup.authorityControlProfiles[1].authorityDomain);
assert.ok(audit.failures.includes("unresolved_material_control_challenge"));
console.log(JSON.stringify({ ok: true, failure: result.failures[0], elapsedDeadlineDidNotEraseChallenge: true }));
