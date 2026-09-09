import assert from "node:assert/strict";
import { assessContentAddressedExternalGateState } from "../runtime.mjs";
import { fullSetup } from "../fixtures.mjs";

const setup = fullSetup();
setup.externalGateStateArtifacts[0].contentHash = "sha256:forged-disabled-state";
const result = assessContentAddressedExternalGateState(setup);
assert.deepEqual(result.failures, ["external_gate_state_hash_mismatch_disabled"]);
console.log(JSON.stringify({ ok: true, failure: result.failures[0], forgedState: "disabled" }));
