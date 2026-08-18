import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  closeLockedExecution,
  hashExecutionArtifacts,
  verifyExecutionAttestation,
} from "../execution-closure.mjs";
import {
  buildExecutionDescriptor,
  createExecutionLock,
  sealEnvironment,
} from "../execution-lock.mjs";
import { lockProtocol, sha256 } from "../protocol-lock.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(await readFile(resolve(here, "../fixtures/negative-control-protocol.json"), "utf8"));
const artifactNames = ["raw_results.json", "computed_output.json", "comparison.json", "classification.json"];

function environment() {
  return sealEnvironment({
    runtime: { name: "fixture", version: "1.0.0" },
    system: { platform: "fixture", architecture: "fixture", endianness: "LE" },
    dependencies: [{ id: "fixture-standard-library", version: "1.0.0", source: "fixture" }],
  });
}

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "corpus-execution-closure-"));
  const enginePath = join(directory, "engine.mjs");
  const modulePath = join(directory, "module.mjs");
  await writeFile(enginePath, "export const engine = 'generic';\n");
  await writeFile(modulePath, "export const model = 'non-research-fixture';\n");
  const specification = {
    engine: { id: "generic-test-engine", version: "1.0.0", files: [{ id: "engine.mjs", path: enginePath }] },
    module: { id: "generic-test-module", version: "1.0.0", files: [{ id: "module.mjs", path: modulePath }] },
    environment: environment(),
  };
  const protocolLock = lockProtocol(manifest);
  const executionLock = createExecutionLock(protocolLock, await buildExecutionDescriptor(specification));
  return { directory, enginePath, specification, protocolLock, executionLock };
}

async function executeFixture(protocolLock, outputDirectory) {
  await mkdir(outputDirectory);
  const raw = { rawHash: sha256({ protocolHash: protocolLock.protocolHash, value: 17 }) };
  const classification = { classificationHash: sha256({ rawHash: raw.rawHash, status: "fixture" }) };
  const payloads = {
    "raw_results.json": { protocolHash: protocolLock.protocolHash, value: 17 },
    "computed_output.json": { doubled: 34 },
    "comparison.json": { equal: true },
    "classification.json": { status: "fixture" },
  };
  await Promise.all(Object.entries(payloads).map(([name, payload]) => (
    writeFile(resolve(outputDirectory, name), `${JSON.stringify(payload)}\n`, { flag: "wx" })
  )));
  return { raw, classification };
}

test("a non-research execution is closed and attested against its exact artifacts", async () => {
  const item = await fixture();
  const outputDirectory = join(item.directory, "result");
  const result = await closeLockedExecution({
    protocolLock: item.protocolLock,
    executionLock: item.executionLock,
    captureExecutionDescriptor: () => buildExecutionDescriptor(item.specification),
    execute: executeFixture,
    outputDirectory,
    artifactNames,
  });
  const stored = JSON.parse(await readFile(join(outputDirectory, "execution_attestation.json"), "utf8"));
  const actualHashes = await hashExecutionArtifacts(outputDirectory, artifactNames);
  assert.deepEqual(stored, result.attestation);
  assert.deepEqual(stored.artifactHashes, actualHashes);
  assert.equal(verifyExecutionAttestation(item.protocolLock, item.executionLock, stored, actualHashes), true);
});

test("engine drift is rejected before the execution function can run", async () => {
  const item = await fixture();
  await writeFile(item.enginePath, "export const engine = 'changed-after-lock';\n");
  let executed = false;
  await assert.rejects(closeLockedExecution({
    protocolLock: item.protocolLock,
    executionLock: item.executionLock,
    captureExecutionDescriptor: () => buildExecutionDescriptor(item.specification),
    execute: async () => { executed = true; },
    outputDirectory: join(item.directory, "drift-result"),
    artifactNames,
  }), /Engine differs/);
  assert.equal(executed, false);
});

test("an existing output directory is refused without running or overwriting", async () => {
  const item = await fixture();
  const outputDirectory = join(item.directory, "existing-result");
  await mkdir(outputDirectory);
  await writeFile(join(outputDirectory, "keep.txt"), "unchanged\n");
  let executed = false;
  await assert.rejects(closeLockedExecution({
    protocolLock: item.protocolLock,
    executionLock: item.executionLock,
    captureExecutionDescriptor: () => buildExecutionDescriptor(item.specification),
    execute: async () => { executed = true; },
    outputDirectory,
    artifactNames,
  }), /Output directory already exists/);
  assert.equal(executed, false);
  assert.equal(await readFile(join(outputDirectory, "keep.txt"), "utf8"), "unchanged\n");
});

test("a missing declared artifact prevents attestation", async () => {
  const item = await fixture();
  const outputDirectory = join(item.directory, "incomplete-result");
  await assert.rejects(closeLockedExecution({
    protocolLock: item.protocolLock,
    executionLock: item.executionLock,
    captureExecutionDescriptor: () => buildExecutionDescriptor(item.specification),
    execute: async (protocolLock, target) => {
      await mkdir(target);
      await writeFile(join(target, "raw_results.json"), "{}\n", { flag: "wx" });
      return {
        raw: { rawHash: sha256({ protocolHash: protocolLock.protocolHash }) },
        classification: { classificationHash: sha256({ status: "incomplete" }) },
      };
    },
    outputDirectory,
    artifactNames,
  }), /ENOENT/);
  await assert.rejects(access(join(outputDirectory, "execution_attestation.json")), /ENOENT/);
});

test("non-canonical artifact aliases are rejected before execution", async () => {
  const item = await fixture();
  for (const [index, alias] of [
    "nested/../raw_results.json",
    "nested/../execution_attestation.json",
  ].entries()) {
    let executed = false;
    await assert.rejects(closeLockedExecution({
      protocolLock: item.protocolLock,
      executionLock: item.executionLock,
      captureExecutionDescriptor: () => buildExecutionDescriptor(item.specification),
      execute: async () => { executed = true; },
      outputDirectory: join(item.directory, `alias-result-${index}`),
      artifactNames: [alias],
    }), /canonical relative form/);
    assert.equal(executed, false);
  }
});
