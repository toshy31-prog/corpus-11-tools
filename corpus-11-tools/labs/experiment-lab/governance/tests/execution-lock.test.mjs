import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { lockProtocol } from "../protocol-lock.mjs";
import {
  buildExecutionDescriptor,
  computeExperimentFingerprint,
  createExecutionLock,
  sealEnvironment,
  verifyExecutionLock,
} from "../execution-lock.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(await readFile(resolve(here, "../fixtures/negative-control-protocol.json"), "utf8"));

function environment(version = "18.19.1") {
  return sealEnvironment({
    runtime: { name: "node", version, v8: "test-v8", modulesAbi: "109", napi: "9", uv: "test-uv", unicode: "15.1" },
    system: { platform: "linux", architecture: "x64", endianness: "LE" },
    dependencies: [{ id: "node-standard-library", version, source: "runtime" }],
  });
}

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), "corpus-execution-lock-"));
  const enginePath = join(directory, "engine.mjs");
  const modulePath = join(directory, "module.mjs");
  const unrelatedPath = join(directory, "notes.md");
  await writeFile(enginePath, "export const engine = 1;\n");
  await writeFile(modulePath, "export const moduleVersion = 1;\n");
  await writeFile(unrelatedPath, "not executed\n");
  const specification = {
    engine: { id: "test-engine", version: "1.0.0", files: [{ id: "engine.mjs", path: enginePath }] },
    module: { id: "test-module", version: "1.0.0", files: [{ id: "module.mjs", path: modulePath }] },
    environment: environment(),
  };
  return { directory, enginePath, modulePath, unrelatedPath, specification };
}

test("experiment fingerprint is deterministic and binds the protocol plus execution", async () => {
  const item = await fixture();
  const protocol = lockProtocol(manifest);
  const first = await buildExecutionDescriptor(item.specification);
  const second = await buildExecutionDescriptor(item.specification);
  const lock = createExecutionLock(protocol, first);
  assert.deepEqual(first, second);
  assert.equal(lock.experimentFingerprint, computeExperimentFingerprint(protocol.protocolHash, first));
  assert.equal(verifyExecutionLock(protocol, lock, second), true);
});

test("changing one engine line after locking is refused", async () => {
  const item = await fixture();
  const protocol = lockProtocol(manifest);
  const locked = await buildExecutionDescriptor(item.specification);
  const lock = createExecutionLock(protocol, locked);
  await writeFile(item.enginePath, "export const engine = 2;\n");
  const changed = await buildExecutionDescriptor(item.specification);
  assert.throws(() => verifyExecutionLock(protocol, lock, changed), /Engine differs/);
});

test("changing the declared module version is refused", async () => {
  const item = await fixture();
  const protocol = lockProtocol(manifest);
  const locked = await buildExecutionDescriptor(item.specification);
  const lock = createExecutionLock(protocol, locked);
  const changed = await buildExecutionDescriptor({
    ...item.specification,
    module: { ...item.specification.module, version: "1.0.1" },
  });
  assert.throws(() => verifyExecutionLock(protocol, lock, changed), /Module differs/);
});

test("changing the declared environment is refused", async () => {
  const item = await fixture();
  const protocol = lockProtocol(manifest);
  const locked = await buildExecutionDescriptor(item.specification);
  const lock = createExecutionLock(protocol, locked);
  const changed = await buildExecutionDescriptor({ ...item.specification, environment: environment("20.0.0") });
  assert.throws(() => verifyExecutionLock(protocol, lock, changed), /Environment differs/);
});

test("rewriting the execution lock invalidates its internal fingerprints", async () => {
  const item = await fixture();
  const protocol = lockProtocol(manifest);
  const descriptor = await buildExecutionDescriptor(item.specification);
  const lock = structuredClone(createExecutionLock(protocol, descriptor));
  lock.execution.engine.files[0].sha256 = "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  assert.throws(() => verifyExecutionLock(protocol, lock, descriptor), /file-set hash is inconsistent/);
});

test("an unrelated file is deliberately outside the execution fingerprint", async () => {
  const item = await fixture();
  const protocol = lockProtocol(manifest);
  const locked = await buildExecutionDescriptor(item.specification);
  const lock = createExecutionLock(protocol, locked);
  await writeFile(item.unrelatedPath, "changed but still not executed\n");
  const unchanged = await buildExecutionDescriptor(item.specification);
  assert.equal(verifyExecutionLock(protocol, lock, unchanged), true);
});
