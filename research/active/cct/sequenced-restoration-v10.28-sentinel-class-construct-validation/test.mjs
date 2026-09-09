import test from "node:test";
import assert from "node:assert/strict";
import { assessSentinelClassConstructValidation } from "./runtime.mjs";
import { fullSetup } from "./fixtures.mjs";

test("grounds every class and window label in an execution descriptor", () => {
  const result = assessSentinelClassConstructValidation(fullSetup());
  assert.equal(result.status, "sentinel_class_construct_validation_candidate");
  assert.equal(result.constructAudits.length, 12);
  assert.equal(result.realPathEquivalenceEstablished, false);
});

test("a privileged label without authorization trace is proxy substitution", () => {
  const setup = fullSetup();
  const item = setup.sentinelExecutionDescriptors.find((entry) => entry.sentinelId === "sentinel-privileged-rotation");
  item.authorizationTraceHash = null;
  const result = assessSentinelClassConstructValidation(setup);
  assert.deepEqual(result.failures, ["sentinel_class_construct_not_supported"]);
  assert.ok(result.constructAudits.find((audit) => audit.sentinelId === item.sentinelId).failures.includes("privileged_authorization_not_observed"));
});

test("a delayed sentinel observed at startup does not validate the steady window", () => {
  const setup = fullSetup();
  const item = setup.sentinelExecutionDescriptors.find((entry) => entry.sentinelId === "sentinel-delayed_activation-steady_state");
  item.observedOffsetMs = 50;
  const result = assessSentinelClassConstructValidation(setup);
  assert.ok(result.constructAudits.find((audit) => audit.sentinelId === item.sentinelId).failures.includes("sentinel_outside_claimed_window"));
});
