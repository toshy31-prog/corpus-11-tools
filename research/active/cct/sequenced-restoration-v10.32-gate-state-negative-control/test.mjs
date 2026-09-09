import test from "node:test";
import assert from "node:assert/strict";
import { assessGateStateNegativeControl } from "./runtime.mjs";
import { fullSetup } from "./fixtures.mjs";
import { runLocalGateMatrix } from "../sequenced-restoration-v10.30-local-runtime-capture-reobservation/local-gate-harness.mjs";

test("all cells switch from blocked to passed when the gate is enabled", () => {
  const result = assessGateStateNegativeControl(fullSetup());
  assert.equal(result.status, "gate_state_negative_control_candidate");
  assert.equal(result.transitionAudits.length, 12);
  assert.equal(result.allCellsDiscriminateGateState, true);
  assert.equal(result.productionGateCouplingEstablished, false);
});

test("rejects an instrument that always reports blocked", () => {
  const alwaysBlocked = () => runLocalGateMatrix(false);
  const result = assessGateStateNegativeControl(fullSetup(), alwaysBlocked);
  assert.deepEqual(result.failures, ["gate_state_discrimination_failed"]);
  assert.ok(result.transitionAudits.every((audit) => audit.failures.includes("enabled_gate_did_not_pass")));
});

test("rejects a state pair whose cell identities are reordered", () => {
  const reordered = (enabled) => enabled ? [...runLocalGateMatrix(true)].reverse() : runLocalGateMatrix(false);
  const result = assessGateStateNegativeControl(fullSetup(), reordered);
  assert.ok(result.transitionAudits.some((audit) => audit.failures.includes("state_pair_identity_mismatch")));
});
