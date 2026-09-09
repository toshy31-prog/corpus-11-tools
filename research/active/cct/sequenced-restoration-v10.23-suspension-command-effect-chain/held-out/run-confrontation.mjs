import assert from "node:assert/strict";
import { assessSuspensionCommandEffectChain } from "../runtime.mjs";
import { fullSetup } from "../fixtures.mjs";

const setup = fullSetup();
setup.suspensionEffectChain[4].observedTraceHash = "sha256:unrelated-attempt";
const result = assessSuspensionCommandEffectChain(setup);
assert.deepEqual(result.failures, ["observer_not_linked_to_blocked_attempt"]);
console.log(JSON.stringify({ ok: true, failure: result.failures[0], strongestEstablishedLink: result.strongestEstablishedLink }));
