import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateSpec } from "./contract.mjs";

const root = new URL(".", import.meta.url);
const candidate = JSON.parse(readFileSync(new URL("./candidate.json", root)));
test("candidate passes the complete structural contract", () => assert.deepEqual(validateSpec(candidate), []));

test("mutations deleting core safeguards are rejected", () => {
  const mutated = structuredClone(candidate);
  mutated.non_negotiable_obligations.attribution.identity_proxy_forbidden = false;
  mutated.non_negotiable_obligations.economic_direction.vital_decommodified = false;
  mutated.non_negotiable_obligations.margins.single_common_failure_insufficient = false;
  mutated.non_negotiable_obligations.equal_treatment_data.aggregated_anonymized_statistics_required = false;
  assert.deepEqual(validateSpec(mutated).sort(), [
    "missing:attribution.identity_proxy_forbidden",
    "missing:economic_direction.vital_decommodified",
    "missing:equal_treatment_data.aggregated_anonymized_statistics_required",
    "missing:margins.single_common_failure_insufficient"
  ]);
});
