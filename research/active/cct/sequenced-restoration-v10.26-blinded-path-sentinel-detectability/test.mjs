import test from "node:test";
import assert from "node:assert/strict";
import { assessBlindedPathSentinelDetectability } from "./runtime.mjs";
import { fullSetup } from "./fixtures.mjs";

test("requires both discovery channels to recover both blinded sentinels", () => {
  const result = assessBlindedPathSentinelDetectability(fullSetup());
  assert.equal(result.status, "blinded_path_sentinel_detectability_candidate");
  assert.equal(result.declaredChannelSentinelDetectabilityEstablished, true);
  assert.equal(result.unknownPathDetectabilityEstablished, false);
});

test("agreement between channels does not hide a commonly missed sentinel", () => {
  const setup = fullSetup();
  setup.blindedPathSentinelTrial.channelDetections.forEach((report) => report.detectedPaths.pop());
  const result = assessBlindedPathSentinelDetectability(setup);
  assert.deepEqual(result.failures, ["declared_channel_detectability_failed"]);
  assert.ok(result.detectionAudits.every((audit) => audit.missedSentinels.includes("sentinel-hidden-route-b")));
});

test("the scanner cannot inject its own sentinel", () => {
  const setup = fullSetup();
  setup.blindedPathSentinelTrial.injectorRootId = setup.executionPathDiscoveryReports[0].scannerRootId;
  const result = assessBlindedPathSentinelDetectability(setup);
  assert.ok(result.failures.includes("sentinel_injector_not_independent"));
});
