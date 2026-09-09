import assert from "node:assert/strict";
import { assessEffectiveAuthorityCenterSeparation } from "../runtime.mjs";
import { fullSetup } from "../fixtures.mjs";

const setup = fullSetup();
setup.authorityControlProfiles[1].vetoControllerId = setup.authorityControlProfiles[0].vetoControllerId;
const result = assessEffectiveAuthorityCenterSeparation(setup);
assert.deepEqual(result.failures, ["nominal_domains_share_effective_control_center"]);
assert.deepEqual(result.sharedControls[0].dimensions, ["vetoControllerId"]);
console.log(JSON.stringify({ ok: true, failure: result.failures[0], effectiveCenters: result.effectiveCenters }));
