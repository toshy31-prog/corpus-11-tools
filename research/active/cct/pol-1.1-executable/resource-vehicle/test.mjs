import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateResourceVehicle } from "./contract.mjs";

const root = new URL(".", import.meta.url);
const vehicle = JSON.parse(readFileSync(new URL("./resource-vehicle.json", root)));

test("the resource vehicle cannot call itself funded or operational", () => {
  assert.deepEqual(validateResourceVehicle(vehicle), []);
  assert.equal(vehicle.status, "design_only_no_funds_no_legal_host");
});

test("a vehicle fails if it converts a pledge into aid or makes recipients absorb its reporting", () => {
  const mutated = structuredClone(vehicle);
  mutated.funding_truth.no_pledge_is_treated_as_cash = false;
  mutated.funding_truth.no_outreach_as_a_service_offer_before_resources_exist = false;
  mutated.required_resource_components = mutated.required_resource_components.filter((item) => item !== "recipient_administrative_burden_covered");
  mutated.light_reporting.funds_cover_reporting_cost = false;
  assert.deepEqual(validateResourceVehicle(mutated).sort(), [
    "missing:funding_truth.no_outreach_as_a_service_offer_before_resources_exist",
    "missing:funding_truth.no_pledge_is_treated_as_cash",
    "missing:light_reporting.funds_cover_reporting_cost",
    "missing:required_resource_components.recipient_administrative_burden_covered"
  ]);
});

test("a vehicle fails if it centralizes control, exposes people, or claims an effect before one exists", () => {
  const mutated = structuredClone(vehicle);
  mutated.governance.separate_financial_custody_and_independent_review = false;
  mutated.governance.personal_data_or_beneficiary_lists_forbidden = false;
  mutated.governance.funds_cannot_buy_coercive_or_discriminatory_capacity = false;
  mutated.governance.funding_cannot_condition_vital_access_or_service_authority = false;
  mutated.disbursement_rules.no_exclusive_supplier_or_platform_for_vital_continuity = false;
  mutated.disbursement_rules.repair_fund_reserved_before_start = false;
  mutated.not_established = mutated.not_established.filter((state) => state !== "material_effect");
  assert.deepEqual(validateResourceVehicle(mutated).sort(), [
    "missing:disbursement_rules.no_exclusive_supplier_or_platform_for_vital_continuity",
    "missing:disbursement_rules.repair_fund_reserved_before_start",
    "missing:governance.funding_cannot_condition_vital_access_or_service_authority",
    "missing:governance.funds_cannot_buy_coercive_or_discriminatory_capacity",
    "missing:governance.personal_data_or_beneficiary_lists_forbidden",
    "missing:governance.separate_financial_custody_and_independent_review",
    "missing:not_established.material_effect"
  ]);
});
