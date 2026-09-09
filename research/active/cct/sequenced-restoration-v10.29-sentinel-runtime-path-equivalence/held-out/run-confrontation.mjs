import assert from "node:assert/strict";
import { assessSentinelRuntimePathEquivalence } from "../runtime.mjs";
import { fullSetup } from "../fixtures.mjs";

const setup = fullSetup();
const target = setup.matchedRuntimePathDescriptors.find((item) => item.sentinelId === "sentinel-alias-steady_state");
target.aliasResolutionDepth = 0;
const result = assessSentinelRuntimePathEquivalence(setup);
assert.deepEqual(result.failures, ["sentinel_runtime_equivalence_failed"]);
assert.deepEqual(result.equivalenceAudits.find((audit) => audit.sentinelId === target.sentinelId).mismatchedFields, ["aliasResolutionDepth"]);
console.log(JSON.stringify({ ok: true, failure: result.failures[0], failedPair: target.sentinelId }));
