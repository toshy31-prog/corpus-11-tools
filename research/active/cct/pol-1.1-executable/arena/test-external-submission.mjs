import test from "node:test";
import assert from "node:assert/strict";
import { classifyExternalSubmission, validateExternalSubmission } from "./validate-external-submission.mjs";

const submission = {
  id: "RIVER-SUPPLY-001",
  version: "1.0.0",
  author: { id: "author-river-17", relationship_to_cct_author: "unknown", contact_or_provenance: "public archive reference" },
  scope: { place_or_system: "one bounded river supply system", period: "October to December 2026", question: "whether a contingency plan preserves safe access under a route outage" },
  evidence: [{ claim: "the route outage limits delivery", source: "public service bulletin 2026-10-01", limits: "does not measure household-level access" }],
  state: {
    axes: ["vital_access", "equal_treatment", "ecological_buffer", "anti_domination", "repair_capacity"],
    initial_conditions: { vital_access: { value: 3, unit: "service-level" } },
    events_and_delays: [{ tick: 1, axis: "vital_access", delta: -2, uncertainty: "route duration is estimated" }],
    irreversibilities: [{ axis: "vital_access", threshold: 1, reason: "safe access loss can produce immediate harm" }]
  },
  action_ontology: [{ id: "local-stock-release", public_semantics: "release locally held emergency stock", costs_and_capacity: "one shared logistics unit", known_harms: "stock may be depleted before resupply" }],
  fairness: { same_public_information_for_all_contenders: true, same_action_budget_for_all_contenders: true, same_action_ontology_for_all_contenders: true, rival_predicted_to_do_better_on: "a centralized plan may restore supply faster" },
  reversal_conditions: ["withdraw the claim if safe access falls below threshold under matched constraints"],
  safety_and_privacy: { sensitive_data_present: false, publication_constraints: "publish aggregate service evidence only" }
};

test("an external submission is admissible only when its comparison inputs are inspectable", () => {
  assert.deepEqual(validateExternalSubmission(submission), []);
  assert.equal(classifyExternalSubmission(submission).admission, "admissible_for_internal_development_only");
  const independent = structuredClone(submission);
  independent.author.relationship_to_cct_author = "independent";
  assert.equal(classifyExternalSubmission(independent).admission, "eligible_for_independent_arena");
});

test("a narrative placeholder, unfair budget, or missing provenance is rejected", () => {
  const mutated = structuredClone(submission);
  mutated.id = "EXTERNAL-SCENARIO-ID";
  mutated.author.contact_or_provenance = "";
  mutated.state.initial_conditions = "machine-readable values and units";
  mutated.fairness.same_action_budget_for_all_contenders = false;
  assert.deepEqual(validateExternalSubmission(mutated).sort(), [
    "missing:author.contact_or_provenance",
    "missing:fairness.same_action_budget_for_all_contenders",
    "missing:id",
    "missing:state.initial_conditions_machine_readable"
  ]);
  assert.equal(classifyExternalSubmission(mutated).admission, "rejected");
});
