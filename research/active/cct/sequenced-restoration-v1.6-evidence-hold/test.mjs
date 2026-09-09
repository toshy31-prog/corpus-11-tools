import test from "node:test";
import assert from "node:assert/strict";
import { evidenceHoldEligible } from "./runtime.mjs";

test("evidence hold requires every open debt axis to remain protected", () => {
  assert.equal(evidenceHoldEligible({ protectsAxes: ["droits", "attribution_du_pouvoir"] }, ["droits", "attribution_du_pouvoir"]), true);
  assert.equal(evidenceHoldEligible({ protectsAxes: ["droits"] }, ["droits", "attribution_du_pouvoir"]), false);
});
