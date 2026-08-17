#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createEngine } from "../../../../../corpus-11-tools/labs/experiment-lab/core/engine.mjs";
import { temporalFrustrationPlugin } from "../plugins/temporal-frustration.mjs";
import { createAccessGuard, evaluateLockedReversals, prepareExecution, sealRawResults } from "../../../../../corpus-11-tools/labs/experiment-lab/governance/protocol-lock.mjs";
import { buildExecutionDescriptor, createExecutionLock, verifyExecutionLock } from "../../../../../corpus-11-tools/labs/experiment-lab/governance/execution-lock.mjs";
import { makeNoisyTournament } from "./temporal-predictive-validation.mjs";

const runnerPath = fileURLToPath(import.meta.url);
const labDirectory = resolve(dirname(runnerPath), "..");
const corpusLabDirectory = resolve(labDirectory, "../../../../corpus-11-tools/labs/experiment-lab");
const pluginPath = resolve(labDirectory, "plugins/temporal-frustration.mjs");
const engineFiles = [
  "core/contracts.mjs", "core/engine.mjs", "core/reproducibility.mjs",
  "governance/execution-lock.mjs", "governance/protocol-lock.mjs",
  "scientific/temporal-predictive-validation.mjs", "scientific/temporal-latent-ablation.mjs",
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

export function degreeMultiset(width, mask) {
  const degrees = Array(width).fill(0);
  pairs(width).forEach(([left, right], index) => {
    if ((mask >> index) & 1) degrees[left] += 1;
    else degrees[right] += 1;
  });
  return degrees.sort((a, b) => a - b);
}

function signature(width, mask) {
  return degreeMultiset(width, mask).join(",");
}

export function buildDegreeMatchedNull(width) {
  const edgeCount = width * (width - 1) / 2;
  if (edgeCount > 21) throw new Error("Exact matched-null enumeration is limited to 21 edges");
  const buckets = new Map();
  for (let mask = 0; mask < 2 ** edgeCount; mask += 1) {
    const key = signature(width, mask);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(mask);
  }
  return {
    sample(mask, random) {
      const bucket = buckets.get(signature(width, mask));
      return bucket[random() % bucket.length];
    },
  };
}

export async function computeLatentAblationModelHash() {
  const hash = createHash("sha256");
  for (const [id, path] of [["runner", runnerPath], ["module", pluginPath]]) {
    hash.update(`${id}\0`); hash.update(await readFile(path)); hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}

export async function captureLatentAblationDescriptor() {
  return buildExecutionDescriptor({
    engine: {
      id: "temporal-frustration-latent-ablation-runner", version: "1.0.0",
      files: engineFiles.map((id) => ({
        id,
        path: resolve(id.startsWith("core/") || id.startsWith("governance/")
          ? corpusLabDirectory : labDirectory, id),
      })),
    },
    module: {
      id: temporalFrustrationPlugin.manifest.id, version: temporalFrustrationPlugin.manifest.version,
      files: [{ id: "plugins/temporal-frustration.mjs", path: pluginPath }],
    },
  });
}

function validateConfiguration(configuration) {
  if (configuration?.experimentKind !== "latent_order_degree_matched_ablation") throw new Error("Unsupported scientific experiment kind");
  if (!Number.isInteger(configuration.width) || configuration.width < 4 || configuration.width > 7) throw new Error("width must be 4..7");
  if (!Number.isInteger(configuration.samplesPerNoise) || configuration.samplesPerNoise < 1) throw new Error("samplesPerNoise must be positive");
  const edgeCount = configuration.width * (configuration.width - 1) / 2;
  if (!Array.isArray(configuration.flipCounts) || configuration.flipCounts.length < 2
    || configuration.flipCounts.some((value) => !Number.isInteger(value) || value < 0 || value > edgeCount)) {
    throw new Error("flipCounts must fit the tournament");
  }
  const permutation = configuration.relabeling;
  if (!Array.isArray(permutation) || permutation.length !== configuration.width
    || [...permutation].sort((a, b) => a - b).some((value, index) => value !== index)) throw new Error("invalid relabeling");
}

function engine(width, observer, seed) {
  return createEngine(temporalFrustrationPlugin, { width, observer, seed });
}

function optimize(width, mask, observer, seed) {
  const instance = engine(width, observer, seed);
  instance.operate("load_tournament", { mask });
  return { instance, optimum: instance.observe("minimum_frustration") };
}

function score(width, mask, order, observer, seed) {
  const instance = engine(width, observer, seed);
  instance.operate("load_tournament", { mask });
  instance.operate("set_candidate_order", { order });
  return { instance, violations: instance.observe("candidate_order_score").violations };
}

export async function executeLatentAblation(protocolLock, executionLock, outputDirectory) {
  const descriptor = await captureLatentAblationDescriptor();
  verifyExecutionLock(protocolLock, executionLock, descriptor);
  const configuration = protocolLock.protocol.model.configuration;
  validateConfiguration(configuration);
  const execution = prepareExecution(protocolLock, {
    protocolHash: protocolLock.protocolHash,
    modelContentHash: await computeLatentAblationModelHash(),
    observableIds: protocolLock.protocol.observables.map(({ id }) => id),
    controlIds: protocolLock.protocol.controls.map(({ id }) => id),
    observer: protocolLock.protocol.observer,
    seed: protocolLock.protocol.seed,
  });
  const guard = createAccessGuard(protocolLock, execution);
  const random = makeRandom(protocolLock.protocol.seed);
  const vertices = Array.from({ length: configuration.width }, (_, index) => index);
  const matchedNull = buildDegreeMatchedNull(configuration.width);
  const edgeCount = configuration.width * (configuration.width - 1) / 2;
  const records = [];
  const totalsByNoise = {};
  let aViolations = 0;
  let bViolations = 0;
  let localStatisticMismatches = 0;
  let representationMismatches = 0;
  let oracleMismatches = 0;

  for (const flipCount of configuration.flipCounts) {
    const totals = { samples: 0, aViolations: 0, bViolations: 0 };
    totalsByNoise[String(flipCount)] = totals;
    for (let sample = 0; sample < configuration.samplesPerNoise; sample += 1) {
      guard.authorize("generate_latent_pair");
      const latentOrder = shuffled(vertices, random);
      const aTrain = makeNoisyTournament(configuration.width, latentOrder, flipCount, random);
      const aTest = makeNoisyTournament(configuration.width, latentOrder, flipCount, random);
      guard.authorize("sample_degree_matched_pair");
      const bTrain = matchedNull.sample(aTrain, random);
      const bTest = matchedNull.sample(aTest, random);
      if (signature(configuration.width, aTrain) !== signature(configuration.width, bTrain)
        || signature(configuration.width, aTest) !== signature(configuration.width, bTest)) localStatisticMismatches += 1;

      guard.authorize("optimize_a_training");
      const aFit = optimize(configuration.width, aTrain, protocolLock.protocol.observer, protocolLock.protocol.seed);
      guard.authorize("score_a_test");
      const aScore = score(configuration.width, aTest, aFit.optimum.witnessOrder, protocolLock.protocol.observer, protocolLock.protocol.seed);
      guard.authorize("optimize_b_training");
      const bFit = optimize(configuration.width, bTrain, protocolLock.protocol.observer, protocolLock.protocol.seed);
      guard.authorize("score_b_test");
      const bScore = score(configuration.width, bTest, bFit.optimum.witnessOrder, protocolLock.protocol.observer, protocolLock.protocol.seed);
      guard.authorize("score_latent_oracle");
      const oracle = score(configuration.width, aTest, latentOrder, protocolLock.protocol.observer, protocolLock.protocol.seed);
      if (oracle.violations !== flipCount) oracleMismatches += 1;
      guard.authorize("audit_representation");
      aFit.instance.perturb("relabel_vertices", { permutation: configuration.relabeling });
      aScore.instance.perturb("relabel_vertices", { permutation: configuration.relabeling });
      bFit.instance.perturb("relabel_vertices", { permutation: configuration.relabeling });
      bScore.instance.perturb("relabel_vertices", { permutation: configuration.relabeling });
      if (aFit.instance.observe("minimum_frustration").minimumViolations !== aFit.optimum.minimumViolations
        || aScore.instance.observe("candidate_order_score").violations !== aScore.violations
        || bFit.instance.observe("minimum_frustration").minimumViolations !== bFit.optimum.minimumViolations
        || bScore.instance.observe("candidate_order_score").violations !== bScore.violations) representationMismatches += 1;

      aViolations += aScore.violations; bViolations += bScore.violations;
      totals.samples += 1; totals.aViolations += aScore.violations; totals.bViolations += bScore.violations;
      records.push({ flipCount, sample, latentOrder, aTrain, aTest, bTrain, bTest,
        degreeMultisetTrain: degreeMultiset(configuration.width, aTrain),
        degreeMultisetTest: degreeMultiset(configuration.width, aTest),
        aTrainingMinimum: aFit.optimum.minimumViolations, aTestViolations: aScore.violations,
        bTrainingMinimum: bFit.optimum.minimumViolations, bTestViolations: bScore.violations,
        oracleTestViolations: oracle.violations });
    }
  }

  const sampleCount = records.length;
  const aAdvantage = edgeCount * sampleCount - 2 * aViolations;
  const bAdvantage = edgeCount * sampleCount - 2 * bViolations;
  const dependenceContrast = aAdvantage - bAdvantage;
  const residualQuarterTest = 4 * bAdvantage - aAdvantage;
  const raw = sealRawResults(protocolLock, execution, {
    observables: {
      sample_records: records,
      totals_by_noise: totalsByNoise,
      a_predictive_advantage_doubled: aAdvantage,
      b_predictive_advantage_doubled: bAdvantage,
      dependence_contrast_doubled: dependenceContrast,
      b_residual_quarter_test: residualQuarterTest,
      local_statistic_mismatches: localStatisticMismatches,
      representation_mismatches: representationMismatches,
      oracle_mismatches: oracleMismatches,
    },
    controls: {
      exact_random_order_expectation: { passed: true, doubledExpectedViolationsPerTournament: edgeCount },
      degree_multiset_matching: { passed: localStatisticMismatches === 0, mismatches: localStatisticMismatches },
      representation_invariance: { passed: representationMismatches === 0, mismatches: representationMismatches },
      latent_generator_oracle: { passed: oracleMismatches === 0, mismatches: oracleMismatches },
    },
  }, guard.snapshot());
  const classification = evaluateLockedReversals(protocolLock, raw);
  const computed = { protocolHash: protocolLock.protocolHash, experimentFingerprint: executionLock.experimentFingerprint,
    rawHash: raw.rawHash, sampleCount, edgeCount, aViolations, bViolations,
    aAdvantageDoubled: aAdvantage, bAdvantageDoubled: bAdvantage,
    dependenceContrastDoubled: dependenceContrast, bResidualQuarterTest: residualQuarterTest, totalsByNoise };
  const comparison = { protocolHash: protocolLock.protocolHash, experimentFingerprint: executionLock.experimentFingerprint,
    rawHash: raw.rawHash, groups: {
      A: "shared explicitly generated latent order",
      B: "independent uniform tournaments conditioned only on A's degree multisets",
      C: "exact random-order expectation plus matching, representation and generator controls",
    }, controls: raw.controls, allControlsPassed: Object.values(raw.controls).every(({ passed }) => passed) };
  await mkdir(outputDirectory, { recursive: false });
  for (const [name, value] of Object.entries({ "raw_results.json": raw, "computed_output.json": computed,
    "comparison.json": comparison, "classification.json": classification })) {
    await writeFile(resolve(outputDirectory, name), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
  }
  const artifactHashes = {};
  for (const name of ["raw_results.json", "computed_output.json", "comparison.json", "classification.json"]) {
    artifactHashes[name] = `sha256:${createHash("sha256").update(await readFile(resolve(outputDirectory, name))).digest("hex")}`;
  }
  const attestation = { schema: "corpus-experiment-execution-attestation/v1", protocolHash: protocolLock.protocolHash,
    experimentFingerprint: executionLock.experimentFingerprint, rawHash: raw.rawHash,
    classificationHash: classification.classificationHash, artifactHashes };
  await writeFile(resolve(outputDirectory, "execution_attestation.json"), JSON.stringify(attestation, null, 2) + "\n", { flag: "wx" });
  return { raw, computed, comparison, classification, attestation };
}

async function main() {
  const [command, protocolPath, executionPath, outputDirectory] = process.argv.slice(2);
  if (command === "model-hash") { console.log(await computeLatentAblationModelHash()); return; }
  if (!command || !protocolPath || !executionPath) throw new Error("Usage: temporal-latent-ablation.mjs model-hash | lock PROTOCOL EXECUTION | run PROTOCOL EXECUTION OUTPUT");
  const protocolLock = JSON.parse(await readFile(protocolPath, "utf8"));
  if (command === "lock") {
    const lock = createExecutionLock(protocolLock, await captureLatentAblationDescriptor());
    await writeFile(executionPath, JSON.stringify(lock, null, 2) + "\n", { flag: "wx" });
    console.log(lock.experimentFingerprint); return;
  }
  if (command === "run" && outputDirectory) {
    const executionLock = JSON.parse(await readFile(executionPath, "utf8"));
    const result = await executeLatentAblation(protocolLock, executionLock, outputDirectory);
    console.log(`experiment_fingerprint=${result.attestation.experimentFingerprint}`);
    console.log(`raw_hash=${result.raw.rawHash}`);
    console.log(`classification=${result.classification.status}`); return;
  }
  throw new Error(`Unsupported command: ${command}`);
}

if (process.argv[1] && resolve(process.argv[1]) === runnerPath) await main();
