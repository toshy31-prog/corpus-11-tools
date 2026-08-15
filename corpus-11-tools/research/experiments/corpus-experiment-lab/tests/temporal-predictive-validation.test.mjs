import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { lockProtocol } from "../governance/protocol-lock.mjs";
import { createExecutionLock } from "../governance/execution-lock.mjs";
import {
  capturePredictiveExecutionDescriptor,
  computeScientificModelHash,
  executePredictiveValidation,
  makeNoisyTournament,
} from "../scientific/temporal-predictive-validation.mjs";

test("noisy tournament generation is deterministic", () => {
  const sequence = [5, 4, 3, 2, 1, 0];
  let cursor = 0;
  const random = () => sequence[cursor++ % sequence.length];
  const first = makeNoisyTournament(4, [0, 1, 2, 3], 2, random);
  cursor = 0;
  const second = makeNoisyTournament(4, [0, 1, 2, 3], 2, random);
  assert.equal(first, second);
});

test("closed predictive runner produces mechanically classified sealed output", async () => {
  const modelHash = await computeScientificModelHash();
  const manifest = {
    schema: "corpus-experiment-protocol/v1",
    protocolId: "temporal-predictive-test-fixture",
    version: "1.0.0",
    hypothesis: "The training optimum predicts held-out relations better than an independent order.",
    alternatives: ["It does not."],
    model: {
      id: "temporal-frustration-predictive-validation",
      version: "1.0.0",
      contentHash: modelHash,
      configuration: {
        experimentKind: "latent_order_predictive_validation",
        width: 5,
        samplesPerNoise: 2,
        flipCounts: [0, 2],
        relabeling: [2, 4, 1, 0, 3],
      },
    },
    observables: [
      { id: "sample_records", measure: "records", channel: "test" },
      { id: "totals_by_noise", measure: "totals", channel: "test" },
      { id: "predictive_advantage_numerator", measure: "advantage", channel: "test" },
      { id: "monotonicity_violations", measure: "violations", channel: "test" },
      { id: "representation_mismatches", measure: "mismatches", channel: "test" },
      { id: "oracle_mismatches", measure: "mismatches", channel: "test" },
    ],
    controls: [
      { id: "independent_random_order", purpose: "baseline" },
      { id: "representation_invariance", purpose: "representation" },
      { id: "latent_order_generation", purpose: "generation" },
    ],
    observer: {
      allowedOperations: ["generate_pair", "optimize_training_order", "score_test_order", "score_control_order", "score_oracle_order", "audit_representation"],
      maxSteps: 24,
      successThreshold: 1,
    },
    reversalConditions: [
      { id: "no_advantage", observableId: "predictive_advantage_numerator", operator: "lte", value: 0, outcome: "predictive_claim_not_supported" },
      { id: "nonmonotone", observableId: "monotonicity_violations", operator: "gt", value: 0, outcome: "noise_prediction_not_supported" },
    ],
    seed: 42,
    analysis: { stoppingRule: "One test run.", comparisonPlan: "Mechanical comparison." },
    classification: { allowedOutcomes: ["predictive_claim_not_supported", "noise_prediction_not_supported", "not_triggered"] },
  };
  const protocolLock = lockProtocol(manifest);
  const executionLock = createExecutionLock(protocolLock, await capturePredictiveExecutionDescriptor());
  const directory = await mkdtemp(join(tmpdir(), "temporal-predictive-test-"));
  const result = await executePredictiveValidation(protocolLock, executionLock, join(directory, "results"));
  assert.equal(result.raw.protocolHash, protocolLock.protocolHash);
  assert.equal(result.attestation.experimentFingerprint, executionLock.experimentFingerprint);
  assert.equal(result.raw.access.used, 24);
  assert.equal(result.raw.observables.representation_mismatches, 0);
  assert.equal(result.raw.observables.oracle_mismatches, 0);
});
