export function validateReadiness(spec) {
  const errors = [];
  const require = (condition, name) => {
    if (!condition) errors.push(`missing:${name}`);
  };
  const entry = spec.non_negotiable_entry_conditions ?? {};

  require(spec.document_kind === "cct_pol_1_1_pre_adoption_gate", "document_kind");
  require(spec.lifecycle?.state === "not_admissible", "lifecycle.state");
  require(spec.lifecycle?.highest_established === "written_and_statically_validated", "lifecycle.highest_established");
  for (const state of ["local_authorization", "affected_people_approval", "independent_review", "deployment", "post_shock_observation", "external_robustness", "adoption"]) {
    require(spec.lifecycle?.not_established?.includes(state), `lifecycle.not_established.${state}`);
  }
  for (const field of [
    "bounded_scope",
    "no_vital_service_replacement",
    "no_deprivation_control_group",
    "local_authorization_separate_from_cct",
    "affected_people_can_refuse_without_losing_rights",
    "independent_review_with_separate_funding",
    "pre_registered_comparator",
    "counterview_register",
    "data_minimization_and_bounded_recourse",
    "stop_owner_independent_of_delivery",
    "safe_state_and_recovery_exercise_required",
    "repair_fund_committed_before_start",
    "public_aggregate_reporting",
    "adoption_not_inferred_from_single_trial"
  ]) require(entry[field] === true, `entry.${field}`);
  for (const axis of ["vital_access", "equal_treatment", "ecological_integrity", "autonomous_capacity", "recourse_and_repair"]) {
    require(entry.outcomes_are_non_compensable?.includes(axis), `entry.outcomes_are_non_compensable.${axis}`);
  }
  for (const condition of ["rights_violation_or_unconsented_exposure", "irreversible_ecological_harm_or_loss_of_critical_buffer", "refusal_or_exit_becomes_materially_unusable", "unplanned_displacement_of_cost_or_risk", "loss_of_local_control_or_independent_review", "stop_or_recovery_capacity_fails_rehearsal", "repair_fund_or_recourse_becomes_unavailable"]) {
    require(spec.automatic_suspension_conditions?.includes(condition), `automatic_suspension_conditions.${condition}`);
  }
  for (const attestation of ["competent_local_authority", "affected_people_governance_body", "independent_reviewer", "repair_fund_holder"]) {
    require(spec.required_external_attestations?.includes(attestation), `required_external_attestations.${attestation}`);
  }
  return errors;
}
