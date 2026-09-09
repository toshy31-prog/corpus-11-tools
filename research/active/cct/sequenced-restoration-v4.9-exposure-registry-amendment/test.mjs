import test from "node:test";
import assert from "node:assert/strict";
import { assessExposureRegistryPairScan } from "../sequenced-restoration-v4.8-exposure-registry-pair-scan/runtime.mjs";
import { assessRegistryAmendment, computeRegistryAmendmentDigest, CctRegistryAmendmentRuntime } from "./runtime.mjs";
import { audit, axes, completeExercise, validAmendment } from "./fixtures.mjs";

test("admits a committed independent proposal only for a future campaign", () => {
  assert.deepEqual(assessRegistryAmendment(axes, audit, completeExercise(), validAmendment()), {
    status: "precommitted_future_registry_amendment_candidate",
    effectiveCampaignId: "campaign-4.9-followup",
    currentCampaignUnchanged: true,
    failures: []
  });
});

test("a post-outcome proposal cannot rewrite the current registry", () => {
  const exercise = completeExercise();
  assert.equal(assessExposureRegistryPairScan(axes, audit, exercise).status, "bounded_exposure_registry_pair_scan_candidate");
  const amendment = validAmendment();
  amendment.proposedAtTick = 7;
  amendment.commitment.committedAtTick = 7;
  amendment.commitment.digest = computeRegistryAmendmentDigest(amendment);
  assert.deepEqual(assessRegistryAmendment(axes, audit, exercise, amendment), {
    status: "not_established",
    failures: ["registry_amendment_protocol_invalid"]
  });
});

test("an amendment cannot take effect in the campaign that motivated it", () => {
  const amendment = validAmendment();
  amendment.effectiveCampaignId = amendment.currentCampaignId;
  amendment.commitment.digest = computeRegistryAmendmentDigest(amendment);
  assert.deepEqual(assessRegistryAmendment(axes, audit, completeExercise(), amendment), {
    status: "not_established",
    failures: ["registry_amendment_protocol_invalid"]
  });
});

test("shared attestation control does not establish independent support", () => {
  const amendment = validAmendment();
  amendment.attestations[1].controller = amendment.attestations[0].controller;
  amendment.commitment.digest = computeRegistryAmendmentDigest(amendment);
  assert.deepEqual(assessRegistryAmendment(axes, audit, completeExercise(), amendment), {
    status: "not_established",
    failures: ["registry_amendment_independence_unestablished"]
  });
});

test("runtime blocks when no allowed action carries a valid amendment packet", () => {
  const runtime = new CctRegistryAmendmentRuntime();
  runtime.state.phase = "staged_restoration_receipt_pending";
  runtime.state.debts = axes.map((axis) => ({ axis, status: "open" }));
  assert.throws(() => runtime.decide({ view: { cct: { tick: 9 } }, allowedActions: ["restore"] }), {
    message: /CCT_REGISTRY_AMENDMENT_UNESTABLISHED/
  });
});
