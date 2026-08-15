import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { lockProtocol } from "../governance/protocol-lock.mjs";
import { createExecutionLock } from "../governance/execution-lock.mjs";
import { buildDegreeMatchedNull, captureLatentAblationDescriptor, computeLatentAblationModelHash,
  degreeMultiset, executeLatentAblation } from "../scientific/temporal-latent-ablation.mjs";

test("matched null preserves the exact degree multiset", () => {
  const nullModel = buildDegreeMatchedNull(5);
  let state = 7;
  const random = () => (state = (Math.imul(1664525, state) + 1013904223) >>> 0);
  for (const mask of [0, 1, 37, 511, 1023]) {
    assert.deepEqual(degreeMultiset(5, nullModel.sample(mask, random)), degreeMultiset(5, mask));
  }
});

test("closed ablation runner produces sealed A/B/C output", async () => {
  const manifest = {
    schema: "corpus-experiment-protocol/v1", protocolId: "temporal-latent-ablation-fixture", version: "1.0.0",
    hypothesis: "Predictive advantage is larger with a shared injected order than under a degree-matched null.",
    alternatives: ["The contrast is absent."],
    model: { id: "temporal-frustration-latent-ablation", version: "1.0.0",
      contentHash: await computeLatentAblationModelHash(), configuration: {
        experimentKind: "latent_order_degree_matched_ablation", width: 5, samplesPerNoise: 2,
        flipCounts: [0, 2], relabeling: [2, 4, 1, 0, 3],
      } },
    observables: ["sample_records", "totals_by_noise", "a_predictive_advantage_doubled", "b_predictive_advantage_doubled",
      "dependence_contrast_doubled", "b_residual_quarter_test", "local_statistic_mismatches",
      "representation_mismatches", "oracle_mismatches"].map((id) => ({ id, measure: id, channel: "test" })),
    controls: ["exact_random_order_expectation", "degree_multiset_matching", "representation_invariance", "latent_generator_oracle"]
      .map((id) => ({ id, purpose: id })),
    observer: { allowedOperations: ["generate_latent_pair", "sample_degree_matched_pair", "optimize_a_training", "score_a_test",
      "optimize_b_training", "score_b_test", "score_latent_oracle", "audit_representation"], maxSteps: 32, successThreshold: 1 },
    reversalConditions: [
      { id: "a_absent", observableId: "a_predictive_advantage_doubled", operator: "lte", value: 0, outcome: "a_not_replicated" },
      { id: "contrast_absent", observableId: "dependence_contrast_doubled", operator: "lte", value: 0, outcome: "injected_structure_dependence_not_supported" },
      { id: "matching_failure", observableId: "local_statistic_mismatches", operator: "gt", value: 0, outcome: "protocol_invalid" },
    ], seed: 9, analysis: { stoppingRule: "One run.", comparisonPlan: "Locked exact contrast." },
    classification: { allowedOutcomes: ["a_not_replicated", "injected_structure_dependence_not_supported", "protocol_invalid", "not_triggered"] },
  };
  const protocolLock = lockProtocol(manifest);
  const executionLock = createExecutionLock(protocolLock, await captureLatentAblationDescriptor());
  const directory = await mkdtemp(join(tmpdir(), "temporal-ablation-test-"));
  const result = await executeLatentAblation(protocolLock, executionLock, join(directory, "results"));
  assert.equal(result.raw.access.used, 32);
  assert.equal(result.raw.observables.local_statistic_mismatches, 0);
  assert.equal(result.attestation.experimentFingerprint, executionLock.experimentFingerprint);
});
