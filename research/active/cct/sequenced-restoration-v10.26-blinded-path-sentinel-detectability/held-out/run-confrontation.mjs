import assert from "node:assert/strict";
import { assessBlindedPathSentinelDetectability } from "../runtime.mjs";
import { fullSetup } from "../fixtures.mjs";

const setup = fullSetup();
setup.blindedPathSentinelTrial.channelDetections[1].detectedPaths = ["sentinel-hidden-route-a"];
const result = assessBlindedPathSentinelDetectability(setup);
assert.deepEqual(result.failures, ["declared_channel_detectability_failed"]);
assert.deepEqual(result.detectionAudits[1].missedSentinels, ["sentinel-hidden-route-b"]);
console.log(JSON.stringify({ ok: true, failure: result.failures[0], failedChannel: "runtime_discovery" }));
