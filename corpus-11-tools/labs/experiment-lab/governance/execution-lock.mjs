import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { endianness } from "node:os";
import { canonicalStringify, sha256, verifyProtocolLock } from "./protocol-lock.mjs";

export const EXECUTION_DESCRIPTOR_SCHEMA = "corpus-experiment-execution/v1";
export const EXECUTION_LOCK_SCHEMA = "corpus-experiment-execution-lock/v1";

function canonicalClone(value) {
  return JSON.parse(canonicalStringify(value));
}

function requireHash(value, label) {
  if (!/^sha256:[0-9a-f]{64}$/.test(value ?? "")) throw new Error(`${label} must be a sha256 hash`);
}

function componentFingerprint(component) {
  return sha256({ id: component.id, version: component.version, contentHash: component.contentHash });
}

export async function hashFileSet(files) {
  if (!Array.isArray(files) || files.length === 0) throw new Error("A fingerprinted file set must not be empty");
  const ids = files.map(({ id }) => id);
  if (ids.some((id) => typeof id !== "string" || !id) || new Set(ids).size !== ids.length) {
    throw new Error("Fingerprint file ids must be unique non-empty strings");
  }
  const entries = [];
  for (const { id, path } of [...files].sort((left, right) => left.id.localeCompare(right.id))) {
    const digest = createHash("sha256").update(await readFile(path)).digest("hex");
    entries.push({ id, sha256: `sha256:${digest}` });
  }
  return { files: entries, contentHash: sha256(entries) };
}

export function sealEnvironment(environment) {
  const content = canonicalClone(environment);
  if (!content.runtime || !content.system || !Array.isArray(content.dependencies)) {
    throw new Error("Environment must declare runtime, system and dependencies");
  }
  return { ...content, contentHash: sha256(content) };
}

export function captureEnvironment() {
  return sealEnvironment({
    runtime: {
      name: "node",
      version: process.versions.node,
      v8: process.versions.v8,
      modulesAbi: process.versions.modules,
      napi: process.versions.napi,
      uv: process.versions.uv,
      unicode: process.versions.unicode,
    },
    system: {
      platform: process.platform,
      architecture: process.arch,
      endianness: endianness(),
    },
    dependencies: [
      { id: "node-standard-library", version: process.versions.node, source: "runtime" },
    ],
  });
}

export async function buildExecutionDescriptor({ engine, module, environment = captureEnvironment() }) {
  const engineFiles = await hashFileSet(engine.files);
  const moduleFiles = await hashFileSet(module.files);
  const engineComponent = {
    id: engine.id,
    version: engine.version,
    files: engineFiles.files,
    contentHash: engineFiles.contentHash,
  };
  engineComponent.fingerprint = componentFingerprint(engineComponent);
  const moduleComponent = {
    id: module.id,
    version: module.version,
    files: moduleFiles.files,
    contentHash: moduleFiles.contentHash,
  };
  moduleComponent.fingerprint = componentFingerprint(moduleComponent);
  const descriptor = canonicalClone({
    schema: EXECUTION_DESCRIPTOR_SCHEMA,
    engine: engineComponent,
    module: moduleComponent,
    environment,
  });
  validateExecutionDescriptor(descriptor);
  return descriptor;
}

export function validateExecutionDescriptor(descriptor) {
  if (descriptor?.schema !== EXECUTION_DESCRIPTOR_SCHEMA) throw new Error("Invalid execution descriptor schema");
  for (const label of ["engine", "module"]) {
    const component = descriptor[label];
    if (!component?.id || !component?.version || !Array.isArray(component?.files) || component.files.length === 0) {
      throw new Error(`${label} must declare id, version and files`);
    }
    requireHash(component.contentHash, `${label}.contentHash`);
    requireHash(component.fingerprint, `${label}.fingerprint`);
    if (component.fingerprint !== componentFingerprint(component)) throw new Error(`${label} fingerprint is inconsistent`);
    if (component.contentHash !== sha256(component.files)) throw new Error(`${label} file-set hash is inconsistent`);
  }
  requireHash(descriptor.environment?.contentHash, "environment.contentHash");
  const { contentHash, ...environment } = descriptor.environment ?? {};
  if (contentHash !== sha256(environment)) throw new Error("environment hash is inconsistent");
  return true;
}

export function computeExperimentFingerprint(protocolHash, descriptor) {
  validateExecutionDescriptor(descriptor);
  requireHash(protocolHash, "protocolHash");
  return sha256({
    protocolHash,
    engineHash: descriptor.engine.fingerprint,
    moduleHash: descriptor.module.fingerprint,
    environmentHash: descriptor.environment.contentHash,
  });
}

export function createExecutionLock(protocolLock, descriptor) {
  verifyProtocolLock(protocolLock);
  validateExecutionDescriptor(descriptor);
  const execution = canonicalClone(descriptor);
  return canonicalClone({
    schema: EXECUTION_LOCK_SCHEMA,
    protocolHash: protocolLock.protocolHash,
    execution,
    experimentFingerprint: computeExperimentFingerprint(protocolLock.protocolHash, execution),
  });
}

function mismatch(label) {
  throw new Error(`${label} differs from the locked execution`);
}

export function verifyExecutionLock(protocolLock, executionLock, actualDescriptor) {
  verifyProtocolLock(protocolLock);
  if (executionLock?.schema !== EXECUTION_LOCK_SCHEMA) throw new Error("Invalid execution lock schema");
  if (executionLock.protocolHash !== protocolLock.protocolHash) mismatch("Protocol hash");
  validateExecutionDescriptor(executionLock.execution);
  const expected = computeExperimentFingerprint(protocolLock.protocolHash, executionLock.execution);
  if (executionLock.experimentFingerprint !== expected) throw new Error("Experiment fingerprint is inconsistent");
  validateExecutionDescriptor(actualDescriptor);
  if (actualDescriptor.engine.fingerprint !== executionLock.execution.engine.fingerprint) mismatch("Engine");
  if (actualDescriptor.module.fingerprint !== executionLock.execution.module.fingerprint) mismatch("Module");
  if (actualDescriptor.environment.contentHash !== executionLock.execution.environment.contentHash) mismatch("Environment");
  if (computeExperimentFingerprint(protocolLock.protocolHash, actualDescriptor) !== executionLock.experimentFingerprint) {
    mismatch("Experiment fingerprint");
  }
  return true;
}

