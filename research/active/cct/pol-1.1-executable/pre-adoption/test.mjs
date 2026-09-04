import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateReadiness } from "./contract.mjs";

const root = new URL(".", import.meta.url);
const contract = JSON.parse(readFileSync(new URL("./readiness-contract.json", root)));

test("the written gate is structurally complete but remains non-admissible", () => {
  assert.deepEqual(validateReadiness(contract), []);
  assert.equal(contract.lifecycle.state, "not_admissible");
});

test("mutations cannot convert a draft gate into a self-authorized trial", () => {
  const mutated = structuredClone(contract);
  mutated.lifecycle.state = "admissible";
  mutated.non_negotiable_entry_conditions.independent_review_with_separate_funding = false;
  mutated.non_negotiable_entry_conditions.stop_owner_independent_of_delivery = false;
  mutated.non_negotiable_entry_conditions.repair_fund_committed_before_start = false;
  assert.deepEqual(validateReadiness(mutated).sort(), [
    "missing:entry.independent_review_with_separate_funding",
    "missing:entry.repair_fund_committed_before_start",
    "missing:entry.stop_owner_independent_of_delivery",
    "missing:lifecycle.state"
  ]);
});
