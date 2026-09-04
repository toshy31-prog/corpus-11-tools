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
