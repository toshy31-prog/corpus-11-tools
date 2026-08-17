#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createEngine } from "../../../../../corpus-11-tools/labs/experiment-lab/core/engine.mjs";
import { temporalFrustrationPlugin } from "../plugins/temporal-frustration.mjs";
import {
  createAccessGuard,
  evaluateLockedReversals,
  prepareExecution,
  sealRawResults,
} from "../../../../../corpus-11-tools/labs/experiment-lab/governance/protocol-lock.mjs";
import {
  buildExecutionDescriptor,
  createExecutionLock,
  verifyExecutionLock,
} from "../../../../../corpus-11-tools/labs/experiment-lab/governance/execution-lock.mjs";

const runnerPath = fileURLToPath(import.meta.url);
const labDirectory = resolve(dirname(runnerPath), "..");
const corpusLabDirectory = resolve(labDirectory, "../../../../corpus-11-tools/labs/experiment-lab");
const pluginPath = resolve(labDirectory, "plugins/temporal-frustration.mjs");
const engineFiles = [
  "core/contracts.mjs",
  "core/engine.mjs",
  "core/reproducibility.mjs",
  "governance/execution-lock.mjs",
  "governance/protocol-lock.mjs",
  "scientific/temporal-predictive-validation.mjs",
];

function pairs(width) {
  const output = [];
  for (let left = 0; left < width; left += 1) {
    for (let right = left + 1; right < width; right += 1) output.push([left, right]);
  }
  return output;
}

function makeRandom(seed) {
  let state = Number(seed) >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state;
  };
}

function shuffled(values, random) {
  const output = [...values];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const target = random() % (index + 1);
    [output[index], output[target]] = [output[target], output[index]];
  }
  return output;
}

export function makeNoisyTournament(width, latentOrder, flipCount, random) {
  const edges = pairs(width);
  if (!Number.isInteger(flipCount) || flipCount < 0 || flipCount > edges.length) {
    throw new Error("flipCount must fit the tournament edge count");
  }
  const positions = new Map(latentOrder.map((vertex, index) => [vertex, index]));
  const flipped = new Set(shuffled(edges.map((_, index) => index), random).slice(0, flipCount));
  let mask = 0;
  edges.forEach(([left, right], index) => {
    const followsLatent = positions.get(left) < positions.get(right);
    const leftBeatsRight = flipped.has(index) ? !followsLatent : followsLatent;
    if (leftBeatsRight) mask |= 1 << index;
  });
  return mask;
}

export async function computeScientificModelHash() {
  const hash = createHash("sha256");
  for (const [id, path] of [["runner", runnerPath], ["module", pluginPath]]) {
    hash.update(`${id}\0`);
    hash.update(await readFile(path));
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}

export async function capturePredictiveExecutionDescriptor() {
  return buildExecutionDescriptor({
    engine: {
      id: "temporal-frustration-predictive-runner",
      version: "1.0.0",
      files: engineFiles.map((id) => ({
        id,
        path: resolve(id.startsWith("core/") || id.startsWith("governance/")
          ? corpusLabDirectory : labDirectory, id),
      })),
    },
    module: {
      id: temporalFrustrationPlugin.manifest.id,
      version: temporalFrustrationPlugin.manifest.version,
      files: [{ id: "plugins/temporal-frustration.mjs", path: pluginPath }],
    },
  });
}

function validateConfiguration(configuration) {
  if (configuration?.experimentKind !== "latent_order_predictive_validation") {
    throw new Error("Unsupported scientific experiment kind");
  }
  if (!Number.isInteger(configuration.width) || configuration.width < 4 || configuration.width > 7) {
    throw new Error("width must be an integer from 4 to 7");
  }
  if (!Number.isInteger(configuration.samplesPerNoise) || configuration.samplesPerNoise < 1) {
    throw new Error("samplesPerNoise must be positive");
  }
  const edgeCount = configuration.width * (configuration.width - 1) / 2;
  if (!Array.isArray(configuration.flipCounts) || configuration.flipCounts.length < 2
    || configuration.flipCounts.some((value) => !Number.isInteger(value) || value < 0 || value > edgeCount)
    || configuration.flipCounts.some((value, index, values) => index > 0 && value <= values[index - 1])) {
    throw new Error("flipCounts must be a strictly increasing integer array within the edge count");
  }
  const permutation = configuration.relabeling;
  if (!Array.isArray(permutation) || permutation.length !== configuration.width
    || [...permutation].sort((a, b) => a - b).some((value, index) => value !== index)) {
    throw new Error("relabeling must be a permutation of every vertex");
  }
}

function newEngine(width, observer, seed) {
  return createEngine(temporalFrustrationPlugin, { width, observer, seed });
}

function scoreOrder(width, mask, order, observer, seed) {
  const engine = newEngine(width, observer, seed);
  engine.operate("load_tournament", { mask });
  engine.operate("set_candidate_order", { order });
  return { engine, score: engine.observe("candidate_order_score").violations };
}

export async function executePredictiveValidation(protocolLock, executionLock, outputDirectory) {
  const descriptor = await capturePredictiveExecutionDescriptor();
  verifyExecutionLock(protocolLock, executionLock, descriptor);
  const configuration = protocolLock.protocol.model.configuration;
  validateConfiguration(configuration);
  const modelContentHash = await computeScientificModelHash();
  const execution = prepareExecution(protocolLock, {
    protocolHash: protocolLock.protocolHash,
    modelContentHash,
    observableIds: protocolLock.protocol.observables.map(({ id }) => id),
    controlIds: protocolLock.protocol.controls.map(({ id }) => id),
    observer: protocolLock.protocol.observer,
    seed: protocolLock.protocol.seed,
  });
  const guard = createAccessGuard(protocolLock, execution);
  const random = makeRandom(protocolLock.protocol.seed);
  const vertices = Array.from({ length: configuration.width }, (_, index) => index);
  const samples = [];
  const totalsByNoise = {};
  let trainedTotal = 0;
  let controlTotal = 0;
  let representationMismatches = 0;
  let oracleMismatches = 0;

  for (const flipCount of configuration.flipCounts) {
    const totals = { samples: 0, trainedTestViolations: 0, controlTestViolations: 0, oracleTestViolations: 0 };
    totalsByNoise[String(flipCount)] = totals;
    for (let sample = 0; sample < configuration.samplesPerNoise; sample += 1) {
      guard.authorize("generate_pair");
      const latentOrder = shuffled(vertices, random);
      const trainingMask = makeNoisyTournament(configuration.width, latentOrder, flipCount, random);
      const testMask = makeNoisyTournament(configuration.width, latentOrder, flipCount, random);
      const controlOrder = shuffled(vertices, random);

      guard.authorize("optimize_training_order");
      const training = newEngine(configuration.width, protocolLock.protocol.observer, protocolLock.protocol.seed);
      training.operate("load_tournament", { mask: trainingMask });
      const optimum = training.observe("minimum_frustration");

      guard.authorize("score_test_order");
      const trained = scoreOrder(configuration.width, testMask, optimum.witnessOrder,
        protocolLock.protocol.observer, protocolLock.protocol.seed);
      guard.authorize("score_control_order");
      const control = scoreOrder(configuration.width, testMask, controlOrder,
        protocolLock.protocol.observer, protocolLock.protocol.seed);
      guard.authorize("score_oracle_order");
      const oracle = scoreOrder(configuration.width, testMask, latentOrder,
        protocolLock.protocol.observer, protocolLock.protocol.seed);

      guard.authorize("audit_representation");
      training.perturb("relabel_vertices", { permutation: configuration.relabeling });
      const relabelledMinimum = training.observe("minimum_frustration").minimumViolations;
      trained.engine.perturb("relabel_vertices", { permutation: configuration.relabeling });
      const relabelledTest = trained.engine.observe("candidate_order_score").violations;
      if (relabelledMinimum !== optimum.minimumViolations || relabelledTest !== trained.score) {
        representationMismatches += 1;
      }
      if (oracle.score !== flipCount) oracleMismatches += 1;

      totals.samples += 1;
      totals.trainedTestViolations += trained.score;
      totals.controlTestViolations += control.score;
      totals.oracleTestViolations += oracle.score;
      trainedTotal += trained.score;
      controlTotal += control.score;
      samples.push({
        flipCount,
        sample,
        latentOrder,
        trainingMask,
        testMask,
        trainingMinimum: optimum.minimumViolations,
        trainedTestViolations: trained.score,
        controlTestViolations: control.score,
        oracleTestViolations: oracle.score,
      });
    }
  }

  let monotonicityViolations = 0;
  for (let index = 1; index < configuration.flipCounts.length; index += 1) {
    const previous = totalsByNoise[String(configuration.flipCounts[index - 1])];
    const current = totalsByNoise[String(configuration.flipCounts[index])];
    if (current.trainedTestViolations * previous.samples < previous.trainedTestViolations * current.samples) {
      monotonicityViolations += 1;
    }
  }
  const predictiveAdvantage = controlTotal - trainedTotal;
  const raw = sealRawResults(protocolLock, execution, {
    observables: {
      sample_records: samples,
      totals_by_noise: totalsByNoise,
      predictive_advantage_numerator: predictiveAdvantage,
      monotonicity_violations: monotonicityViolations,
      representation_mismatches: representationMismatches,
      oracle_mismatches: oracleMismatches,
    },
    controls: {
      independent_random_order: { passed: predictiveAdvantage > 0, trainedTotal, controlTotal },
      representation_invariance: { passed: representationMismatches === 0, mismatches: representationMismatches },
      latent_order_generation: { passed: oracleMismatches === 0, mismatches: oracleMismatches },
    },
  }, guard.snapshot());
  const classification = evaluateLockedReversals(protocolLock, raw);
  const computed = {
    protocolHash: protocolLock.protocolHash,
    experimentFingerprint: executionLock.experimentFingerprint,
    rawHash: raw.rawHash,
    samples: samples.length,
    totalsByNoise,
    trainedTestViolations: trainedTotal,
    controlTestViolations: controlTotal,
    predictiveAdvantage,
    monotonicityViolations,
  };
  const comparison = {
    protocolHash: protocolLock.protocolHash,
    experimentFingerprint: executionLock.experimentFingerprint,
    rawHash: raw.rawHash,
    controls: raw.controls,
    allControlsPassed: Object.values(raw.controls).every(({ passed }) => passed),
  };
  await mkdir(outputDirectory, { recursive: false });
  for (const [name, value] of Object.entries({
    "raw_results.json": raw,
    "computed_output.json": computed,
    "comparison.json": comparison,
    "classification.json": classification,
  })) {
    await writeFile(resolve(outputDirectory, name), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
  }
  const artifactHashes = {};
  for (const name of ["raw_results.json", "computed_output.json", "comparison.json", "classification.json"]) {
    artifactHashes[name] = `sha256:${createHash("sha256").update(await readFile(resolve(outputDirectory, name))).digest("hex")}`;
  }
  const attestation = {
    schema: "corpus-experiment-execution-attestation/v1",
    protocolHash: protocolLock.protocolHash,
    experimentFingerprint: executionLock.experimentFingerprint,
    rawHash: raw.rawHash,
    classificationHash: classification.classificationHash,
    artifactHashes,
  };
  await writeFile(resolve(outputDirectory, "execution_attestation.json"), JSON.stringify(attestation, null, 2) + "\n", { flag: "wx" });
  return { raw, computed, comparison, classification, attestation };
}

async function main() {
  const [command, protocolPath, executionPath, outputDirectory] = process.argv.slice(2);
  if (command === "model-hash") {
    console.log(await computeScientificModelHash());
    return;
  }
  if (!command || !protocolPath || !executionPath) {
    throw new Error("Usage: temporal-predictive-validation.mjs model-hash | lock PROTOCOL.lock.json EXECUTION.lock.json | run PROTOCOL.lock.json EXECUTION.lock.json OUTPUT_DIRECTORY");
  }
  const protocolLock = JSON.parse(await readFile(protocolPath, "utf8"));
  if (command === "lock") {
    const lock = createExecutionLock(protocolLock, await capturePredictiveExecutionDescriptor());
    await writeFile(executionPath, JSON.stringify(lock, null, 2) + "\n", { flag: "wx" });
    console.log(lock.experimentFingerprint);
    return;
  }
  if (command === "run" && outputDirectory) {
    const executionLock = JSON.parse(await readFile(executionPath, "utf8"));
    const result = await executePredictiveValidation(protocolLock, executionLock, outputDirectory);
    console.log(`experiment_fingerprint=${result.attestation.experimentFingerprint}`);
    console.log(`raw_hash=${result.raw.rawHash}`);
    console.log(`classification=${result.classification.status}`);
    return;
  }
  throw new Error(`Unsupported command: ${command}`);
}

if (process.argv[1] && resolve(process.argv[1]) === runnerPath) await main();
