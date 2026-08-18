#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { temporalFrustrationPlugin } from "../plugins/temporal-frustration.mjs";
import { executeLockedTemporalSample } from "./adapters/temporal-seeded-sample.mjs";
import { closeLockedExecution } from "../../../../../corpus-11-tools/labs/experiment-lab/governance/execution-closure.mjs";
import {
  buildExecutionDescriptor,
  createExecutionLock,
  verifyExecutionLock,
} from "../../../../../corpus-11-tools/labs/experiment-lab/governance/execution-lock.mjs";

const runnerPath = fileURLToPath(import.meta.url);
const governanceDirectory = dirname(runnerPath);
const labDirectory = resolve(governanceDirectory, "..");
const experimentLabDirectory = resolve(governanceDirectory, "../../../../../corpus-11-tools/labs/experiment-lab");

const engineFiles = [
  { id: "corpus/core/contracts.mjs", path: resolve(experimentLabDirectory, "core/contracts.mjs") },
  { id: "corpus/core/engine.mjs", path: resolve(experimentLabDirectory, "core/engine.mjs") },
  { id: "corpus/core/reproducibility.mjs", path: resolve(experimentLabDirectory, "core/reproducibility.mjs") },
  { id: "corpus/governance/execution-closure.mjs", path: resolve(experimentLabDirectory, "governance/execution-closure.mjs") },
  { id: "corpus/governance/execution-lock.mjs", path: resolve(experimentLabDirectory, "governance/execution-lock.mjs") },
  { id: "corpus/governance/protocol-lock.mjs", path: resolve(experimentLabDirectory, "governance/protocol-lock.mjs") },
  { id: "research/governance/adapters/temporal-seeded-sample.mjs", path: resolve(labDirectory, "governance/adapters/temporal-seeded-sample.mjs") },
  { id: "research/governance/closed-temporal-runner.mjs", path: runnerPath },
];

const temporalArtifactNames = [
  "raw_results.json",
  "computed_output.json",
  "comparison.json",
  "classification.json",
];

export async function captureTemporalExecutionDescriptor() {
  return buildExecutionDescriptor({
    engine: {
      id: "corpus-experiment-lab-temporal-runner",
      version: "2.0.0",
      files: engineFiles,
    },
    module: {
      id: temporalFrustrationPlugin.manifest.id,
      version: temporalFrustrationPlugin.manifest.version,
      files: [{ id: "plugins/temporal-frustration.mjs", path: resolve(labDirectory, "plugins/temporal-frustration.mjs") }],
    },
  });
}

export async function runClosedTemporalExperiment(protocolLock, executionLock, outputDirectory) {
  return closeLockedExecution({
    protocolLock,
    executionLock,
    captureExecutionDescriptor: captureTemporalExecutionDescriptor,
    execute: executeLockedTemporalSample,
    outputDirectory,
    artifactNames: temporalArtifactNames,
  });
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
