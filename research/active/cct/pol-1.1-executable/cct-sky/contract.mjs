export function validateSky(spec) {
  const errors = [];
  const require = (condition, label) => { if (!condition) errors.push(`missing:${label}`); };
  const rules = spec.non_negotiable ?? {};
  require(spec.document_kind === "cct_mobile_continuity_architecture", "document_kind");
  require(spec.status === "written_and_statically_validated", "status");
  for (const layer of ["ground", "veins", "vectors"]) require(Array.isArray(spec.layers?.[layer]) && spec.layers[layer].length > 0, `layers.${layer}`);
  for (const field of ["vector_is_not_the_only_vital_channel", "independent_failure_path_required", "local_authority_or_documented_necessity_required", "no_vital_access_conditioned_on_ideology_data_or_publicity", "leaves_local_capacity_behind", "local_workers_paid_and_protected", "recourse_and_stop_are_usable", "departure_does_not_destroy_continuity", "no_identity_based_allocation"]) require(rules[field] === true, `non_negotiable.${field}`);
  for (const item of ["repairable_service_or_local_fallback", "local_access_to_spares_or_materials", "named_local_repair_or_response_capacity", "funded_repair_or_contingency_path", "accessible_recourse"]) require(spec.required_handover?.includes(item), `required_handover.${item}`);
  for (const condition of ["vector_becomes_single_vital_channel", "local_refusal_or_recourse_is_ineffective", "departure_leaves_service_less_capable", "aid_is_conditioned_on_data_publicity_or_political_alignment", "work_is_unpaid_or_unsafe", "allocation_uses_collective_identity_as_proxy"]) require(spec.withdrawal_conditions?.includes(condition), `withdrawal_conditions.${condition}`);
  for (const state of ["vehicle", "local_operator_agreement", "route", "funding", "deployment", "post_shock_effect", "transportability"]) require(spec.not_established?.includes(state), `not_established.${state}`);
  return errors;
}
