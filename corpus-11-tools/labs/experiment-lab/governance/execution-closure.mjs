import { createHash } from "node:crypto";
import { lstat, readFile, writeFile } from "node:fs/promises";
import { isAbsolute, normalize, relative, resolve } from "node:path";
import { verifyExecutionLock } from "./execution-lock.mjs";
import { canonicalStringify, verifyProtocolLock } from "./protocol-lock.mjs";

export const EXECUTION_ATTESTATION_SCHEMA = "corpus-experiment-execution-attestation/v1";
export const EXECUTION_ATTESTATION_FILE = "execution_attestation.json";

const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/;

function requireHash(value, label) {
  if (!SHA256_PATTERN.test(value ?? "")) throw new Error(`${label} must be a sha256 hash`);
}

function normalizeArtifactNames(artifactNames) {
  if (!Array.isArray(artifactNames) || artifactNames.length === 0) {
    throw new Error("artifactNames must contain at least one relative file name");
  }
  const normalizedNames = new Set();
  for (const name of artifactNames) {
    if (typeof name !== "string" || !name || isAbsolute(name)) {
      throw new Error("artifactNames must contain non-empty relative file names");
    }
    const normalizedName = normalize(name);
    if (normalizedName !== name) {
      throw new Error(`Artifact names must use their canonical relative form: ${name}`);
    }
    if (normalizedNames.has(normalizedName)) {
      throw new Error("artifactNames must be unique after path normalization");
    }
    normalizedNames.add(normalizedName);
    const candidate = resolve("/artifact-root", name);
    const local = relative("/artifact-root", candidate);
    if (!local || local === ".." || local.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`)) {
      throw new Error(`Artifact path escapes the output directory: ${name}`);
    }
    if (name === EXECUTION_ATTESTATION_FILE) {
      throw new Error("The execution attestation cannot attest itself");
    }
  }
  return artifactNames;
}

async function byteHash(path) {
  return `sha256:${createHash("sha256").update(await readFile(path)).digest("hex")}`;
}

async function requireFreshOutputDirectory(outputDirectory) {
  if (typeof outputDirectory !== "string" || !outputDirectory) {
    throw new Error("outputDirectory must be a non-empty path");
  }
  try {
    await lstat(outputDirectory);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  throw new Error(`Output directory already exists: ${outputDirectory}`);
}

function validateArtifactHashes(artifactHashes) {
  if (!artifactHashes || typeof artifactHashes !== "object" || Array.isArray(artifactHashes)) {
    throw new Error("artifactHashes must be a non-empty object");
  }
  const names = normalizeArtifactNames(Object.keys(artifactHashes));
  for (const name of names) requireHash(artifactHashes[name], `artifactHashes.${name}`);
}

export async function hashExecutionArtifacts(outputDirectory, artifactNames) {
  const names = normalizeArtifactNames(artifactNames);
  const hashes = {};
  for (const name of names) hashes[name] = await byteHash(resolve(outputDirectory, name));
  return hashes;
}

export function createExecutionAttestation({
  protocolLock,
  executionLock,
  rawHash,
  classificationHash,
  artifactHashes,
}) {
  verifyProtocolLock(protocolLock);
  verifyExecutionLock(protocolLock, executionLock, executionLock?.execution);
  requireHash(rawHash, "rawHash");
  requireHash(classificationHash, "classificationHash");
  validateArtifactHashes(artifactHashes);
  return {
    schema: EXECUTION_ATTESTATION_SCHEMA,
    protocolHash: protocolLock.protocolHash,
    experimentFingerprint: executionLock.experimentFingerprint,
    rawHash,
    classificationHash,
    artifactHashes: structuredClone(artifactHashes),
  };
}

export function verifyExecutionAttestation(
  protocolLock,
  executionLock,
  attestation,
  actualArtifactHashes = undefined,
) {
  if (attestation?.schema !== EXECUTION_ATTESTATION_SCHEMA) {
    throw new Error("Invalid execution attestation schema");
  }
  const expected = createExecutionAttestation({
    protocolLock,
    executionLock,
    rawHash: attestation.rawHash,
    classificationHash: attestation.classificationHash,
    artifactHashes: attestation.artifactHashes,
  });
  if (canonicalStringify(attestation) !== canonicalStringify(expected)) {
    throw new Error("Execution attestation differs from its protocol or execution lock");
  }
  if (actualArtifactHashes !== undefined
    && canonicalStringify(attestation.artifactHashes) !== canonicalStringify(actualArtifactHashes)) {
    throw new Error("Execution attestation artifact hashes differ from the stored artifacts");
  }
  return true;
}

export async function closeLockedExecution({
  protocolLock,
  executionLock,
  captureExecutionDescriptor,
  execute,
  outputDirectory,
  artifactNames,
}) {
  if (typeof captureExecutionDescriptor !== "function") {
    throw new Error("captureExecutionDescriptor must be a function");
  }
  if (typeof execute !== "function") throw new Error("execute must be a function");
  normalizeArtifactNames(artifactNames);
  await requireFreshOutputDirectory(outputDirectory);

  const actualDescriptor = await captureExecutionDescriptor();
  verifyExecutionLock(protocolLock, executionLock, actualDescriptor);
  const result = await execute(protocolLock, outputDirectory);
  if (!result || typeof result !== "object") throw new Error("execute must return an execution result");

  const artifactHashes = await hashExecutionArtifacts(outputDirectory, artifactNames);
  const attestation = createExecutionAttestation({
    protocolLock,
    executionLock,
    rawHash: result.raw?.rawHash,
    classificationHash: result.classification?.classificationHash,
    artifactHashes,
  });
  await writeFile(
    resolve(outputDirectory, EXECUTION_ATTESTATION_FILE),
    `${JSON.stringify(attestation, null, 2)}\n`,
    { flag: "wx" },
  );
  return { ...result, attestation };
}
