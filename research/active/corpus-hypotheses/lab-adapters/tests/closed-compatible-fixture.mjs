import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  hashExecutionArtifacts,
  verifyExecutionAttestation,
} from "../../../../../corpus-11-tools/labs/experiment-lab/governance/execution-closure.mjs";
import { createExecutionLock } from "../../../../../corpus-11-tools/labs/experiment-lab/governance/execution-lock.mjs";
import { lockProtocol } from "../../../../../corpus-11-tools/labs/experiment-lab/governance/protocol-lock.mjs";

const artifactNames = ["raw_results.json", "classification.json"];
const provenanceKeys = new Set([
  "classificationHash",
  "executionHash",
  "experimentFingerprint",
  "modelContentHash",
  "protocolHash",
  "rawHash",
]);

function normalizeProvenance(value) {
  if (Array.isArray(value)) return value.map(normalizeProvenance);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key,
      provenanceKeys.has(key) ? "<provenance>" : normalizeProvenance(item),
    ]));
  }
  return value;
}

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

export async function verifyClosedCompatibleRun({
  prospectiveDirectory,
  sourceUrl,
  computeModelHash,
  captureDescriptor,
  execute,
}) {
  const prospectiveRoot = new URL(`../prospective/${prospectiveDirectory}/`, import.meta.url);
  const manifest = await readJson(new URL("manifest.json", prospectiveRoot));
  manifest.model.contentHash = await computeModelHash();
  const protocolLock = lockProtocol(manifest);
  const descriptor = await captureDescriptor();
  assert.ok(descriptor.engine.files.some(({ id }) => id === "corpus/governance/execution-closure.mjs"));
  const executionLock = createExecutionLock(protocolLock, descriptor);
  const directory = await mkdtemp(join(tmpdir(), `${prospectiveDirectory}-test-`));
  const outputDirectory = join(directory, "results");
  const result = await execute(protocolLock, executionLock, outputDirectory);

  const archivedRaw = await readJson(new URL("results/raw_results.json", prospectiveRoot));
  const archivedClassification = await readJson(new URL("results/classification.json", prospectiveRoot));
  assert.deepEqual(normalizeProvenance(result.raw), normalizeProvenance(archivedRaw));
  assert.deepEqual(normalizeProvenance(result.classification), normalizeProvenance(archivedClassification));
  assert.deepEqual(await readJson(join(outputDirectory, "raw_results.json")), result.raw);
  assert.deepEqual(await readJson(join(outputDirectory, "classification.json")), result.classification);

  const storedAttestation = await readJson(join(outputDirectory, "execution_attestation.json"));
  const artifactHashes = await hashExecutionArtifacts(outputDirectory, artifactNames);
  assert.deepEqual(storedAttestation, result.attestation);
  assert.equal(verifyExecutionAttestation(protocolLock, executionLock, storedAttestation, artifactHashes), true);
  assert.deepEqual(
    (await readdir(outputDirectory)).sort(),
    [...artifactNames, "execution_attestation.json"].sort(),
  );

  const source = await readFile(sourceUrl, "utf8");
  assert.match(source, /closeLockedExecution/);
  assert.doesNotMatch(source, /verifyExecutionLock|corpus-experiment-execution-attestation\/v1|execution_attestation\.json|artifactHashes/);
  return result;
}
