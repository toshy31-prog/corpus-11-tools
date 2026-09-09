import test from "node:test";
import assert from "node:assert/strict";
import { assessEffectiveAuthorityCenterSeparation } from "./runtime.mjs";
import { fullSetup } from "./fixtures.mjs";

test("keeps two nominal domains only when declared control roots remain separate", () => {
  const result = assessEffectiveAuthorityCenterSeparation(fullSetup());
  assert.equal(result.status, "effective_authority_center_separation_candidate");
  assert.equal(result.effectiveCenters, 2);
  assert.equal(result.realWorldIndependenceEstablished, false);
});

test("collapses two domains sharing one effective owner", () => {
  const setup = fullSetup();
  setup.authorityControlProfiles[1].effectiveOwnerId = setup.authorityControlProfiles[0].effectiveOwnerId;
  const result = assessEffectiveAuthorityCenterSeparation(setup);
  assert.deepEqual(result.failures, ["nominal_domains_share_effective_control_center"]);
  assert.equal(result.effectiveCenters, 1);
  assert.deepEqual(result.sharedControls[0].dimensions, ["effectiveOwnerId"]);
});

test("unknown key operation lineage cannot count as separation", () => {
  const setup = fullSetup();
  delete setup.authorityControlProfiles[1].keyOperatorId;
  const result = assessEffectiveAuthorityCenterSeparation(setup);
  assert.deepEqual(result.failures, ["authority_control_lineage_unknown"]);
});
