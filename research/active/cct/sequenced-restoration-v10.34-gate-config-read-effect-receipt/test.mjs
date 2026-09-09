import test from "node:test";
import assert from "node:assert/strict";
import { assessGateConfigReadEffectReceipt } from "./runtime.mjs";
import { fullSetup } from "./fixtures.mjs";
import { createLocalGateComponent } from "../sequenced-restoration-v10.30-local-runtime-capture-reobservation/local-gate-harness.mjs";

test("links each loaded config hash to before-after state and observed effect", () => {
  const result = assessGateConfigReadEffectReceipt(fullSetup());
  assert.equal(result.status, "gate_config_read_effect_receipt_candidate");
  assert.equal(result.transitions.length, 2);
  assert.equal(result.bothConfigReadsLinkedToEffects, true);
  assert.equal(result.processIsolationEstablished, false);
});

test("a component that acknowledges but ignores the enabled state is rejected", () => {
  const ignoringFactory = () => {
    const component = createLocalGateComponent(true);
    return { applyConfig(config, hash) { return component.applyConfig({ ...config, authorityQuorumEnabled: false }, hash); }, attempt() { return component.attempt(); } };
  };
  const result = assessGateConfigReadEffectReceipt(fullSetup(), ignoringFactory);
  assert.ok(result.failures.includes("gate_transition_mismatch_enabled"));
  assert.ok(result.failures.includes("gate_effect_mismatch_enabled"));
});

test("a receipt carrying another artifact hash is rejected", () => {
  const wrongHashFactory = () => {
    const component = createLocalGateComponent(true);
    return { applyConfig(config) { return component.applyConfig(config, "sha256:unrelated"); }, attempt() { return component.attempt(); } };
  };
  const result = assessGateConfigReadEffectReceipt(fullSetup(), wrongHashFactory);
  assert.ok(result.failures.some((failure) => failure.startsWith("config_read_receipt_hash_mismatch_")));
});
