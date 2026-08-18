import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  hashExecutionArtifacts,
  verifyExecutionAttestation,
} from "../../../../../../corpus-11-tools/labs/experiment-lab/governance/execution-closure.mjs";
import { createExecutionLock } from "../../../../../../corpus-11-tools/labs/experiment-lab/governance/execution-lock.mjs";
import { lockProtocol } from "../../../../../../corpus-11-tools/labs/experiment-lab/governance/protocol-lock.mjs";
import { computeModelContentHash } from "../adapters/temporal-seeded-sample.mjs";
import {
  captureTemporalExecutionDescriptor,
  runClosedTemporalExperiment,
} from "../closed-temporal-runner.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const prospectiveDirectory = resolve(here, "../../prospective/temporal-closed-prospective-001");
const historicalResults = resolve(prospectiveDirectory, "results");
const artifactNames = ["raw_results.json", "computed_output.json", "comparison.json", "classification.json"];

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

test("the archived temporal attestation still verifies against its locked artifacts", async () => {
  const protocolLock = await readJson(resolve(prospectiveDirectory, "protocol.lock.json"));
  const executionLock = await readJson(resolve(prospectiveDirectory, "execution.lock.json"));
  const attestation = await readJson(resolve(historicalResults, "execution_attestation.json"));
  const hashes = await hashExecutionArtifacts(historicalResults, artifactNames);
  assert.deepEqual(hashes, attestation.artifactHashes);
  assert.equal(verifyExecutionAttestation(protocolLock, executionLock, attestation, hashes), true);
});

test("the temporal adapter preserves the historical scientific result through Corpus closure", async () => {
  const archivedProtocolLock = await readJson(resolve(prospectiveDirectory, "protocol.lock.json"));
  const currentManifest = structuredClone(archivedProtocolLock.protocol);
  currentManifest.model.contentHash = await computeModelContentHash();
  const protocolLock = lockProtocol(currentManifest);
  const executionLock = createExecutionLock(protocolLock, await captureTemporalExecutionDescriptor());
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "corpus-temporal-closure-"));
  const outputDirectory = join(temporaryDirectory, "result");
  const result = await runClosedTemporalExperiment(protocolLock, executionLock, outputDirectory);

  const historicalRaw = await readJson(resolve(historicalResults, "raw_results.json"));
  const historicalComputed = await readJson(resolve(historicalResults, "computed_output.json"));
  const historicalComparison = await readJson(resolve(historicalResults, "comparison.json"));
  const historicalClassification = await readJson(resolve(historicalResults, "classification.json"));
  assert.deepEqual(result.raw.observables, historicalRaw.observables);
  assert.deepEqual(result.raw.controls, historicalRaw.controls);
  assert.deepEqual(result.raw.access, historicalRaw.access);
  assert.deepEqual(result.computed, {
    ...historicalComputed,
    protocolHash: result.computed.protocolHash,
    rawHash: result.computed.rawHash,
  });
  assert.deepEqual(result.comparison, {
    ...historicalComparison,
    protocolHash: result.comparison.protocolHash,
    rawHash: result.comparison.rawHash,
  });
  assert.deepEqual(result.classification, {
    ...historicalClassification,
    protocolHash: result.classification.protocolHash,
    rawHash: result.classification.rawHash,
    classificationHash: result.classification.classificationHash,
  });
  assert.equal(result.attestation.experimentFingerprint, executionLock.experimentFingerprint);
});
