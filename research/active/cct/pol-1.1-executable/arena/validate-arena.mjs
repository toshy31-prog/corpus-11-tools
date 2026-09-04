#!/usr/bin/env node
import { readFileSync } from "node:fs";

export function validateArena(spec) {
  const errors = [];
  const must = (value, label) => { if (!value || (Array.isArray(value) && value.length === 0)) errors.push(`missing:${label}`); };
  must(spec.lifecycle?.admission_ceiling === "internal_development_only", "lifecycle.admission_ceiling");
  for (const key of ["matched_public_information", "matched_action_budget", "matched_action_ontology", "blind_identity_until_vector_verdict", "scalar_winner_forbidden"]) must(spec.fairness?.[key], `fairness.${key}`);
  for (const axis of ["vital_access", "equal_treatment", "ecological_buffer", "anti_domination", "repair_capacity"]) must(spec.axes?.includes(axis), `axis.${axis}`);
  must(spec.competitors?.some((item) => item.kind === "candidate"), "competitor.candidate");
  must(spec.competitors?.filter((item) => item.kind === "serious_comparator").length >= 2, "competitor.serious_comparators");
  const expected = ["climate_shock", "economic_reconcentration", "administrative_discrimination", "logistics_failure"];
  for (const type of expected) {
    const scenario = spec.scenarios?.find((item) => item.type === type);
    must(scenario, `scenario.${type}`);
    must(scenario?.author_provenance === "internal_synthetic", `scenario.${type}.provenance`);
    must(scenario?.discriminating_question, `scenario.${type}.question`);
    must(scenario?.required_observables, `scenario.${type}.observables`);
    must(scenario?.rival_favorable_prediction, `scenario.${type}.rival_prediction`);
    must(scenario?.reversal_condition, `scenario.${type}.reversal_condition`);
  }
  must(spec.execution_requirements?.includes("A result in this arena may trigger revision or removal, never promotion."), "execution.no_promotion");
  return errors;
}

const spec = JSON.parse(readFileSync(new URL("./pre-registration.json", import.meta.url)));
const errors = validateArena(spec);
console.log(JSON.stringify({ id: spec.id, valid: errors.length === 0, lifecycleCeiling: spec.lifecycle.admission_ceiling, errors }, null, 2));
process.exitCode = errors.length ? 1 : 0;
