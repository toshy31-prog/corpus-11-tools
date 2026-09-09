import test from "node:test";
import assert from "node:assert/strict";
import { assessContentAddressedExternalGateState } from "./runtime.mjs";
import { fullSetup } from "./fixtures.mjs";

test("drives both runtime states from hashed external configuration artifacts", () => {
  const result = assessContentAddressedExternalGateState(fullSetup());
  assert.equal(result.status, "content_addressed_external_gate_state_candidate");
  assert.equal(result.externalStateControlsHarness, true);
  assert.equal(result.artifactHashes.length, 2);
  assert.equal(result.productionGateCouplingEstablished, false);
});

test("detects configuration content changed after hashing", () => {
  const setup = fullSetup();
  setup.externalGateStateArtifacts[1].content = setup.externalGateStateArtifacts[0].content;
  const result = assessContentAddressedExternalGateState(setup);
  assert.ok(result.failures.includes("external_gate_state_hash_mismatch_enabled"));
  assert.ok(result.failures.includes("external_gate_states_not_opposed"));
});

test("two valid hashes with the same gate state do not form a negative control", async () => {
  const setup = fullSetup();
  const { createHash } = await import("node:crypto");
  setup.externalGateStateArtifacts[1].content = setup.externalGateStateArtifacts[0].content;
  setup.externalGateStateArtifacts[1].contentHash = `sha256:${createHash("sha256").update(setup.externalGateStateArtifacts[1].content).digest("hex")}`;
  const result = assessContentAddressedExternalGateState(setup);
  assert.ok(result.failures.includes("external_gate_states_not_opposed"));
});
