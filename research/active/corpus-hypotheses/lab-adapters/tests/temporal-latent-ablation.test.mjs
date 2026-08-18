import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { lockProtocol } from "../../../../../corpus-11-tools/labs/experiment-lab/governance/protocol-lock.mjs";
import { createExecutionLock } from "../../../../../corpus-11-tools/labs/experiment-lab/governance/execution-lock.mjs";
import {
  hashExecutionArtifacts,
  verifyExecutionAttestation,
} from "../../../../../corpus-11-tools/labs/experiment-lab/governance/execution-closure.mjs";
import { buildDegreeMatchedNull, captureLatentAblationDescriptor, computeLatentAblationModelHash,
  degreeMultiset, executeLatentAblation } from "../scientific/temporal-latent-ablation.mjs";

const artifactNames = ["raw_results.json", "computed_output.json", "comparison.json", "classification.json"];

test("matched null preserves the exact degree multiset", () => {
  const nullModel = buildDegreeMatchedNull(5);
  let state = 7;
  const random = () => (state = (Math.imul(1664525, state) + 1013904223) >>> 0);
  for (const mask of [0, 1, 37, 511, 1023]) {
    assert.deepEqual(degreeMultiset(5, nullModel.sample(mask, random)), degreeMultiset(5, mask));
  }
});

test("latent ablation delegates execution closure to Corpus", async () => {
  const descriptor = await captureLatentAblationDescriptor();
  assert.ok(descriptor.engine.files.some(({ id }) => id === "governance/execution-closure.mjs"));
  const source = await readFile(new URL("../scientific/temporal-latent-ablation.mjs", import.meta.url), "utf8");
  assert.match(source, /closeLockedExecution/);
  assert.doesNotMatch(source, /verifyExecutionLock|corpus-experiment-execution-attestation\/v1|execution_attestation\.json|artifactHashes/);
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
  const outputDirectory = join(directory, "results");
  const result = await executeLatentAblation(protocolLock, executionLock, outputDirectory);
  assert.equal(result.raw.access.used, 32);
  assert.equal(result.raw.observables.local_statistic_mismatches, 0);
  assert.equal(result.attestation.experimentFingerprint, executionLock.experimentFingerprint);
  assert.deepEqual({
    sampleCount: result.computed.sampleCount,
    edgeCount: result.computed.edgeCount,
    aViolations: result.computed.aViolations,
    bViolations: result.computed.bViolations,
    aAdvantageDoubled: result.computed.aAdvantageDoubled,
    bAdvantageDoubled: result.computed.bAdvantageDoubled,
    dependenceContrastDoubled: result.computed.dependenceContrastDoubled,
    bResidualQuarterTest: result.computed.bResidualQuarterTest,
    totalsByNoise: result.computed.totalsByNoise,
  }, {
    sampleCount: 4,
    edgeCount: 10,
    aViolations: 8,
    bViolations: 24,
    aAdvantageDoubled: 24,
    bAdvantageDoubled: -8,
    dependenceContrastDoubled: 32,
    bResidualQuarterTest: -56,
    totalsByNoise: {
      0: { samples: 2, aViolations: 0, bViolations: 13 },
      2: { samples: 2, aViolations: 8, bViolations: 11 },
    },
  });
  for (const [name, key] of [
    ["raw_results.json", "raw"],
    ["computed_output.json", "computed"],
    ["comparison.json", "comparison"],
    ["classification.json", "classification"],
  ]) {
    assert.deepEqual(JSON.parse(await readFile(join(outputDirectory, name), "utf8")), result[key]);
  }
  const storedAttestation = JSON.parse(await readFile(join(outputDirectory, "execution_attestation.json"), "utf8"));
  const artifactHashes = await hashExecutionArtifacts(outputDirectory, artifactNames);
  assert.deepEqual(storedAttestation, result.attestation);
  assert.equal(verifyExecutionAttestation(protocolLock, executionLock, storedAttestation, artifactHashes), true);
  assert.deepEqual(
    (await readdir(outputDirectory)).sort(),
    [...artifactNames, "execution_attestation.json"].sort(),
  );
});
