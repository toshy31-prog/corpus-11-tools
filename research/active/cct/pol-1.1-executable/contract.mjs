export function validateSpec(spec) {
  const errors = [];
  const required = (value, label) => {
    if (value === undefined || value === null || value === false || (Array.isArray(value) && value.length === 0)) errors.push(`missing:${label}`);
  };

  required(spec.document_kind === "cct_political_revision_contract", "document_kind");
  required(spec.lifecycle?.state === "written_and_statically_validated", "lifecycle.state");
  for (const field of ["absent_affected", "detection_limits", "beneficiaries_and_cost_bearers", "reversal_condition", "affected_agency"]) required(spec.non_negotiable_obligations?.counterview?.required_fields?.includes(field), `counterview.${field}`);
  required(spec.non_negotiable_obligations?.counterview?.omission_rule === "unjustified_omission_is_suspendable", "counterview.omission_rule");
  required(spec.non_negotiable_obligations?.attribution?.identity_proxy_forbidden, "attribution.identity_proxy_forbidden");
  required(spec.non_negotiable_obligations?.attribution?.legal_term_requires_criteria, "attribution.legal_term_requires_criteria");
  required(spec.non_negotiable_obligations?.economic_direction?.vital_decommodified, "economic_direction.vital_decommodified");
  required(spec.non_negotiable_obligations?.economic_direction?.residual_market_scope === "nonessential_only", "economic_direction.residual_market_scope");
  required(spec.non_negotiable_obligations?.economic_direction?.market_conditions?.includes("socialize_on_durable_rent_or_veto"), "economic_direction.socialize_on_durable_rent_or_veto");
  required(spec.non_negotiable_obligations?.economic_direction?.inheritance_reconstitution_forbidden, "economic_direction.inheritance_reconstitution_forbidden");
  for (const field of ["distributed_reserves_required", "single_common_failure_insufficient", "essential_worker_protection_required", "local_window_and_irreversibility_required"]) required(spec.non_negotiable_obligations?.margins?.[field], `margins.${field}`);
  required(spec.non_negotiable_obligations?.living_systems?.existing_critical_buffers_presumption === "protect", "living_systems.buffer_presumption");
  required(spec.non_negotiable_obligations?.living_systems?.destruction_requires_absence_of_alternative_and_suspensive_recourse, "living_systems.suspensive_recourse");
  for (const field of ["eligibility_distinct_from_individual_outcome", "aggregated_anonymized_statistics_required", "nominal_lists_for_comparative_claims_forbidden", "disparity_requires_adversarial_inquiry"]) required(spec.non_negotiable_obligations?.equal_treatment_data?.[field], `equal_treatment_data.${field}`);
  required(spec.non_negotiable_obligations?.success?.spending_is_not_success, "success.spending_is_not_success");
  required(spec.non_negotiable_obligations?.success?.single_scalar_optimization_forbidden, "success.single_scalar_optimization_forbidden");
  for (const scenario of ["climate_shock", "economic_reconcentration", "administrative_discrimination", "logistics_failure"]) required(spec.future_arena?.required_scenarios?.includes(scenario), `future_arena.${scenario}`);
  required(spec.future_arena?.matched_comparators, "future_arena.matched_comparators");
  required(spec.future_arena?.pre_registered_reversal_conditions, "future_arena.pre_registered_reversal_conditions");
  return errors;
}
