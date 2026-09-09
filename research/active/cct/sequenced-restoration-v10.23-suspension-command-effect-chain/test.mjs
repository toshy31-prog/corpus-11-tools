import test from "node:test";
import assert from "node:assert/strict";
import { assessSuspensionCommandEffectChain } from "./runtime.mjs";
import { fullSetup } from "./fixtures.mjs";

test("establishes suspension through an independently observed blocked attempt", () => {
  const result = assessSuspensionCommandEffectChain(fullSetup());
  assert.equal(result.status, "suspension_command_effect_chain_candidate");
  assert.equal(result.strongestEstablishedLink, "independent_effect_observed");
  assert.equal(result.suspensionEffectEstablished, true);
  assert.equal(result.allExecutionPathsBlocked, false);
});

test("an acknowledgment without a blocked attempt is insufficient", () => {
  const setup = fullSetup();
  setup.suspensionEffectChain.splice(3, 1);
  const result = assessSuspensionCommandEffectChain(setup);
  assert.ok(result.failures.includes("command_effect_sequence_incomplete_or_reordered"));
  assert.ok(result.failures.includes("observer_not_linked_to_blocked_attempt"));
});

test("the executor cannot independently verify its own effect", () => {
  const setup = fullSetup();
  setup.suspensionEffectChain[4].actorId = setup.suspensionEffectChain[2].actorId;
  const result = assessSuspensionCommandEffectChain(setup);
  assert.ok(result.failures.includes("effect_observer_not_independent_of_executor"));
});
