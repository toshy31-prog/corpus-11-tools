#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { temporalFrustrationPlugin } from "../plugins/temporal-frustration.mjs";
import { executeLockedTemporalSample } from "./adapters/temporal-seeded-sample.mjs";
import {
  buildExecutionDescriptor,
  createExecutionLock,
  verifyExecutionLock,
} from "./execution-lock.mjs";

const runnerPath = fileURLToPath(import.meta.url);
const governanceDirectory = dirname(runnerPath);
const labDirectory = resolve(governanceDirectory, "..");

const engineFiles = [
  "core/contracts.mjs",
  "core/engine.mjs",
  "core/reproducibility.mjs",
  "governance/adapters/temporal-seeded-sample.mjs",
  "governance/closed-temporal-runner.mjs",
  "governance/execution-lock.mjs",
  "governance/protocol-lock.mjs",
];

export async function captureTemporalExecutionDescriptor() {
  return buildExecutionDescriptor({
    engine: {
      id: "corpus-experiment-lab-temporal-runner",
      version: "1.0.0",
      files: engineFiles.map((id) => ({ id, path: resolve(labDirectory, id) })),
    },
    module: {
      id: temporalFrustrationPlugin.manifest.id,
      version: temporalFrustrationPlugin.manifest.version,
      files: [{ id: "plugins/temporal-frustration.mjs", path: resolve(labDirectory, "plugins/temporal-frustration.mjs") }],
    },
  });
}

async function fileHash(path) {
  return `sha256:${createHash("sha256").update(await readFile(path)).digest("hex")}`;
}

export async function runClosedTemporalExperiment(protocolLock, executionLock, outputDirectory) {
  const actual = await captureTemporalExecutionDescriptor();
  verifyExecutionLock(protocolLock, executionLock, actual);
  const result = await executeLockedTemporalSample(protocolLock, outputDirectory);
  const artifactHashes = {};
  for (const name of ["raw_results.json", "computed_output.json", "comparison.json", "classification.json"]) {
    artifactHashes[name] = await fileHash(resolve(outputDirectory, name));
  }
  const attestation = {
    schema: "corpus-experiment-execution-attestation/v1",
    protocolHash: protocolLock.protocolHash,
    experimentFingerprint: executionLock.experimentFingerprint,
    rawHash: result.raw.rawHash,
    classificationHash: result.classification.classificationHash,
    artifactHashes,
  };
  await writeFile(resolve(outputDirectory, "execution_attestation.json"), JSON.stringify(attestation, null, 2) + "\n", { flag: "wx" });
  return { ...result, attestation };
}

async function main() {
  const [command, protocolPath, executionPath, outputDirectory] = process.argv.slice(2);
  if (!command || !protocolPath || !executionPath) {
    console.error("Usage: closed-temporal-runner.mjs lock PROTOCOL.lock.json EXECUTION.lock.json | verify PROTOCOL.lock.json EXECUTION.lock.json | run PROTOCOL.lock.json EXECUTION.lock.json NEW_OUTPUT_DIRECTORY");
    process.exit(2);
  }
  const protocolLock = JSON.parse(await readFile(protocolPath, "utf8"));
  if (command === "lock") {
    const executionLock = createExecutionLock(protocolLock, await captureTemporalExecutionDescriptor());
    await writeFile(executionPath, JSON.stringify(executionLock, null, 2) + "\n", { flag: "wx" });
    console.log(executionLock.experimentFingerprint);
    return;
  }
  const executionLock = JSON.parse(await readFile(executionPath, "utf8"));
  if (command === "verify") {
    verifyExecutionLock(protocolLock, executionLock, await captureTemporalExecutionDescriptor());
    console.log(executionLock.experimentFingerprint);
    return;
  }
  if (command === "run" && outputDirectory) {
    const result = await runClosedTemporalExperiment(protocolLock, executionLock, outputDirectory);
    console.log(`experiment_fingerprint=${result.attestation.experimentFingerprint}`);
    console.log(`raw_hash=${result.raw.rawHash}`);
    return;
  }
  throw new Error(`Unsupported command: ${command}`);
}

if (process.argv[1] && resolve(process.argv[1]) === runnerPath) await main();
