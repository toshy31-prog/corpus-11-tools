export function validateMinimumUseCase(spec) {
  const errors = [];
  const require = (condition, label) => { if (!condition) errors.push(`missing:${label}`); };
  const safeguards = spec.non_negotiable ?? {};

  require(spec.document_kind === "cct_minimum_use_case", "document_kind");
  require(spec.status === "candidate_design_not_authorized", "status");
  for (const field of [
    "existing_responsible_operator_retained",
    "no_vital_service_withdrawal_for_comparison",
    "standard_service_guaranteed_at_all_sites",
    "local_refusal_and_recourse",
    "local_repair_capacity_paid",
    "distributed_spares_and_independent_backup",
    "safe_water_quality_check",
    "costs_to_users_and_workers_measured",
    "aggregate_public_reporting",
    "independent_stop_authority_required",
    "repair_and_contingency_fund_required"
  ]) require(safeguards[field] === true, `non_negotiable.${field}`);
  require(spec.comparison?.baseline === "usual reactive centralized maintenance and existing emergency supply", "comparison.baseline");
  require(spec.comparison?.no_deprivation_design === true, "comparison.no_deprivation_design");
  for (const field of ["water_source_type", "population_served", "season", "baseline_reliability", "access_conditions"]) require(spec.comparison?.matching_required?.includes(field), `comparison.matching_required.${field}`);
  for (const outcome of ["safe_water_access", "equal_treatment_and_burden", "worker_safety_and_pay", "local_repair_capacity", "recourse_and_repair"]) require(spec.non_compensable_outcomes?.includes(outcome), `non_compensable_outcomes.${outcome}`);
  for (const condition of ["water_safety_failure", "access_loss_above_pre_registered_threshold_without_immediate_contingency", "unpaid_or_unsafe_maintenance_work", "refusal_or_recourse_unusable", "unplanned_cost_shift_to_users", "loss_of_independent_oversight"]) require(spec.automatic_stop_conditions?.includes(condition), `automatic_stop_conditions.${condition}`);
  for (const state of ["local_site", "local_authorization", "funding", "independent_review", "baseline_measurement", "deployment", "effect", "transportability"]) require(spec.not_established?.includes(state), `not_established.${state}`);
  return errors;
}
