import assert from "node:assert/strict";
import { assessGateConfigReadEffectReceipt } from "../runtime.mjs";
import { fullSetup } from "../fixtures.mjs";
import { createLocalGateComponent } from "../../sequenced-restoration-v10.30-local-runtime-capture-reobservation/local-gate-harness.mjs";

const staleFactory = () => {
  const component = createLocalGateComponent(true);
  let first = true;
  return { applyConfig(config, hash) { const receipt = component.applyConfig(config, hash); if (!first) receipt.loadedConfigHash = "sha256:stale"; first = false; return receipt; }, attempt() { return component.attempt(); } };
};
const result = assessGateConfigReadEffectReceipt(fullSetup(), staleFactory);
assert.ok(result.failures.includes("config_read_receipt_hash_mismatch_enabled"));
console.log(JSON.stringify({ ok: true, failure: "config_read_receipt_hash_mismatch_enabled", staleReceiptBlocked: true }));
