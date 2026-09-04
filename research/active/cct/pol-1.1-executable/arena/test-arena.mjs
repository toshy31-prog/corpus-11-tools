import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateArena } from "./validate-arena.mjs";

const spec = JSON.parse(readFileSync(new URL("./pre-registration.json", import.meta.url)));

test("pre-registration is structurally admissible only as internal development", () => {
  assert.deepEqual(validateArena(spec), []);
  assert.equal(spec.lifecycle.admission_ceiling, "internal_development_only");
});

test("mutations that fabricate a winner or remove a discriminating case are rejected", () => {
  const mutated = structuredClone(spec);
  mutated.fairness.scalar_winner_forbidden = false;
  mutated.scenarios = mutated.scenarios.filter((item) => item.type !== "administrative_discrimination");
  assert.deepEqual(validateArena(mutated).sort(), [
    "missing:fairness.scalar_winner_forbidden",
    "missing:scenario.administrative_discrimination",
    "missing:scenario.administrative_discrimination.observables",
    "missing:scenario.administrative_discrimination.provenance",
    "missing:scenario.administrative_discrimination.question",
    "missing:scenario.administrative_discrimination.reversal_condition",
    "missing:scenario.administrative_discrimination.rival_prediction"
  ]);
});
