import test from "node:test";
import assert from "node:assert/strict";
import { assessLocalRuntimeCaptureReobservation } from "./runtime.mjs";
import { fullSetup } from "./fixtures.mjs";

test("executes and binds one local direct-startup runtime capture", () => {
  const result = assessLocalRuntimeCaptureReobservation(fullSetup());
  assert.equal(result.status, "local_runtime_capture_reobservation_candidate");
  assert.equal(result.localExecutionObserved, true);
  assert.equal(result.captureEnvelope.capture.blocked, true);
  assert.match(result.captureEnvelopeHash, /^sha256:[0-9a-f]{64}$/);
  assert.equal(result.deployedRuntimeObservationEstablished, false);
});

test("refuses a capture when the expected harness hash is stale", () => {
  const result = assessLocalRuntimeCaptureReobservation(fullSetup({ expectedLocalHarnessHash: "sha256:stale" }));
  assert.ok(result.failures.includes("local_harness_hash_mismatch"));
});

test("cannot silently retarget the direct harness to an alias path", () => {
  const result = assessLocalRuntimeCaptureReobservation(fullSetup({ localCaptureTargetSentinelId: "sentinel-alias-startup" }));
  assert.ok(result.failures.includes("local_capture_target_not_precommitted"));
});
