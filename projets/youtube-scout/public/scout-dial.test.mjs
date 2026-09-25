import test from "node:test";
import assert from "node:assert/strict";
import { quantizeScoutDialValue } from "./scout-dial.mjs";

test("le dial partagé borne et quantifie sans dérive", () => {
  assert.equal(quantizeScoutDialValue(1.4, { min: 0, max: 1, step: .05 }), 1);
  assert.equal(quantizeScoutDialValue(-1, { min: 0, max: 1, step: .05 }), 0);
  assert.equal(quantizeScoutDialValue(.527, { min: 0, max: 1, step: .05 }), .55);
  assert.equal(quantizeScoutDialValue(59.6, { min: 0, max: 100, step: 1 }), 60);
});
