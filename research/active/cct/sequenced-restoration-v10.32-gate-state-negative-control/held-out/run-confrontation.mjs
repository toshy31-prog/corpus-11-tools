import assert from "node:assert/strict";
import { assessGateStateNegativeControl } from "../runtime.mjs";
import { fullSetup } from "../fixtures.mjs";
import { runLocalGateMatrix } from "../../sequenced-restoration-v10.30-local-runtime-capture-reobservation/local-gate-harness.mjs";

const stuckPrivileged = (enabled) => runLocalGateMatrix(enabled).map((cell) => cell.requiredPrivilege === "synthetic-admin" && enabled ? { ...cell, blocked: true, passed: false } : cell);
const result = assessGateStateNegativeControl(fullSetup(), stuckPrivileged);
assert.deepEqual(result.failures, ["gate_state_discrimination_failed"]);
assert.equal(result.transitionAudits.filter((audit) => audit.failures.length).length, 3);
console.log(JSON.stringify({ ok: true, failure: result.failures[0], stuckClass: "privileged", failedCells: 3 }));
