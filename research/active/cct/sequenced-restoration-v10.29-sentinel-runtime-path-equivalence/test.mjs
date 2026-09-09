import test from "node:test";
import assert from "node:assert/strict";
import { assessSentinelRuntimePathEquivalence } from "./runtime.mjs";
import { fullSetup } from "./fixtures.mjs";

test("matches every sentinel to a distinct blocked runtime-path fixture", () => {
  const result = assessSentinelRuntimePathEquivalence(fullSetup());
  assert.equal(result.status, "sentinel_runtime_path_equivalence_candidate");
  assert.equal(result.equivalenceAudits.length, 12);
  assert.equal(result.allDeclaredPairsEquivalentOnMeasuredFields, true);
  assert.equal(result.realRuntimeObservationEstablished, false);
});

test("a privileged sentinel cannot stand for an unprivileged runtime path", () => {
  const setup = fullSetup();
  const target = setup.matchedRuntimePathDescriptors.find((item) => item.sentinelId === "sentinel-privileged-rotation");
  target.requiredPrivilege = "none";
  const result = assessSentinelRuntimePathEquivalence(setup);
  assert.deepEqual(result.failures, ["sentinel_runtime_equivalence_failed"]);
  assert.deepEqual(result.equivalenceAudits.find((audit) => audit.sentinelId === target.sentinelId).mismatchedFields, ["requiredPrivilege"]);
});

test("matched structure without an observed block is insufficient", () => {
  const setup = fullSetup();
  setup.matchedRuntimePathDescriptors[0].blocked = false;
  const result = assessSentinelRuntimePathEquivalence(setup);
  assert.ok(result.equivalenceAudits[0].failures.includes("matched_runtime_path_not_observably_blocked"));
});
