export function validateResourceVehicle(spec) {
  const errors = [];
  const require = (condition, label) => { if (!condition) errors.push(`missing:${label}`); };
  const truth = spec.funding_truth ?? {};
  const governance = spec.governance ?? {};
  const rules = spec.disbursement_rules ?? {};
  const reporting = spec.light_reporting ?? {};

  require(spec.document_kind === "cct_resource_vehicle", "document_kind");
  require(spec.status === "design_only_no_funds_no_legal_host", "status");
  for (const field of ["may_claim_funds_available_only_when_ring_fenced", "no_pledge_is_treated_as_cash", "no_outreach_as_a_service_offer_before_resources_exist"]) require(truth[field] === true, `funding_truth.${field}`);
  for (const component of ["critical_spares_or_materials", "independent_backup_or_contingency", "paid_local_maintenance_and_safety", "recourse_and_repair", "recipient_administrative_burden_covered"]) require(spec.required_resource_components?.includes(component), `required_resource_components.${component}`);
  for (const field of ["legal_fiscal_host_required", "local_operator_retains_service_authority", "separate_financial_custody_and_independent_review", "affected_people_recourse_required", "public_aggregate_disbursement_ledger_required", "personal_data_or_beneficiary_lists_forbidden", "funds_cannot_buy_coercive_or_discriminatory_capacity"]) require(governance[field] === true, `governance.${field}`);
  for (const field of ["existing_service_and_local_need_required", "written_itemized_continuity_plan_required", "payment_to_local_operator_or_supplier_under_local_authorization", "no_substitution_for_ordinary_public_duty_without_public_justification", "repair_fund_reserved_before_start", "stop_and_remedy_condition_before_disbursement"]) require(rules[field] === true, `disbursement_rules.${field}`);
  require(reporting.funds_cover_reporting_cost === true, "light_reporting.funds_cover_reporting_cost");
  require(reporting.no_nominal_user_tracking === true, "light_reporting.no_nominal_user_tracking");
  for (const trace of ["baseline_asset_and_dependency_inventory", "purchase_or_payment_receipts", "service_continuity_and_water_safety_status", "incident_and_recovery_log", "aggregate_recourse_and_repair_record"]) require(reporting.minimum_traces?.includes(trace), `light_reporting.minimum_traces.${trace}`);
  for (const state of ["legal_host", "ring_fenced_funds", "financial_custodian", "independent_reviewer", "local_operator_agreement", "disbursement", "material_effect", "renewable_funding"]) require(spec.not_established?.includes(state), `not_established.${state}`);
  return errors;
}
