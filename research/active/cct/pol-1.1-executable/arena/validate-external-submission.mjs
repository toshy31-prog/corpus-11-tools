#!/usr/bin/env node
import { readFileSync } from "node:fs";

const AXES = ["vital_access", "equal_treatment", "ecological_buffer", "anti_domination", "repair_capacity"];
const RELATIONSHIPS = new Set(["independent", "unknown", "dependent"]);

function meaningful(value) {
  return typeof value === "string" && value.trim().length >= 4 && !value.includes("EXTERNAL-SCENARIO-ID");
}

export function validateExternalSubmission(spec) {
  const errors = [];
  const require = (condition, label) => { if (!condition) errors.push(`missing:${label}`); };
  const evidence = spec.evidence ?? [];
  const state = spec.state ?? {};
  const fairness = spec.fairness ?? {};
  const safety = spec.safety_and_privacy ?? {};

  require(meaningful(spec.id), "id");
  require(/^\d+\.\d+\.\d+$/.test(spec.version ?? ""), "version");
  require(meaningful(spec.author?.id), "author.id");
  require(RELATIONSHIPS.has(spec.author?.relationship_to_cct_author), "author.relationship_to_cct_author");
  require(meaningful(spec.author?.contact_or_provenance), "author.contact_or_provenance");
  for (const field of ["place_or_system", "period", "question"]) require(meaningful(spec.scope?.[field]), `scope.${field}`);
  require(Array.isArray(evidence) && evidence.length > 0, "evidence");
  for (const [index, item] of evidence.entries()) {
    for (const field of ["claim", "source", "limits"]) require(meaningful(item?.[field]), `evidence.${index}.${field}`);
  }
  require(Array.isArray(state.axes) && state.axes.length === AXES.length && AXES.every((axis) => state.axes.includes(axis)), "state.axes");
  require(state.initial_conditions && typeof state.initial_conditions === "object" && !Array.isArray(state.initial_conditions), "state.initial_conditions_machine_readable");
  require(Array.isArray(state.events_and_delays) && state.events_and_delays.length > 0, "state.events_and_delays_machine_readable");
  require(Array.isArray(state.irreversibilities) && state.irreversibilities.length > 0, "state.irreversibilities");
  require(Array.isArray(spec.action_ontology) && spec.action_ontology.length > 0, "action_ontology");
  for (const [index, action] of (spec.action_ontology ?? []).entries()) {
    for (const field of ["id", "public_semantics", "costs_and_capacity", "known_harms"]) require(meaningful(action?.[field]), `action_ontology.${index}.${field}`);
  }
  for (const field of ["same_public_information_for_all_contenders", "same_action_budget_for_all_contenders", "same_action_ontology_for_all_contenders"]) require(fairness[field] === true, `fairness.${field}`);
  require(meaningful(fairness.rival_predicted_to_do_better_on), "fairness.rival_predicted_to_do_better_on");
  require(Array.isArray(spec.reversal_conditions) && spec.reversal_conditions.some(meaningful), "reversal_conditions");
  require(typeof safety.sensitive_data_present === "boolean", "safety_and_privacy.sensitive_data_present");
  require(meaningful(safety.publication_constraints), "safety_and_privacy.publication_constraints");
  return errors;
}

export function classifyExternalSubmission(spec) {
  const errors = validateExternalSubmission(spec);
  if (errors.length) return { valid: false, admission: "rejected", errors };
  return {
    valid: true,
    admission: spec.author.relationship_to_cct_author === "independent"
      ? "eligible_for_independent_arena"
      : "admissible_for_internal_development_only",
    errors: []
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const source = process.argv[2] ? new URL(process.argv[2], import.meta.url) : new URL("./external-scenario-submission-template.json", import.meta.url);
  const result = classifyExternalSubmission(JSON.parse(readFileSync(source)));
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.valid ? 0 : 1;
}
