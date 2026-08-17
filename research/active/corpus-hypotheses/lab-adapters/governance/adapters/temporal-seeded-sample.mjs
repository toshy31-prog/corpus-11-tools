#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createEngine } from "../../../../../../corpus-11-tools/labs/experiment-lab/core/engine.mjs";
import { temporalFrustrationPlugin } from "../../plugins/temporal-frustration.mjs";
import {
  createAccessGuard,
  evaluateLockedReversals,
  prepareExecution,
  sealRawResults,
  verifyProtocolLock,
} from "../../../../../../corpus-11-tools/labs/experiment-lab/governance/protocol-lock.mjs";

const adapterPath = fileURLToPath(import.meta.url);
const pluginPath = resolve(dirname(adapterPath), "../../plugins/temporal-frustration.mjs");

export function generateMasks(configuration, seed) {
  const pairCount = configuration.width * (configuration.width - 1) / 2;
  const maskLimit = 2 ** pairCount;
  let state = Number(seed) >>> 0;
  const masks = [];
  for (let index = 0; index < configuration.sampleCount; index += 1) {
    state = (configuration.generator.multiplier * state + configuration.generator.increment) >>> 0;
    masks.push(state % maskLimit);
  }
  return masks;
}

export async function computeModelContentHash() {
  const hash = createHash("sha256");
  for (const path of [adapterPath, pluginPath]) {
    hash.update(path.endsWith("temporal-seeded-sample.mjs") ? "adapter\0" : "plugin\0");
    hash.update(await readFile(path));
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}

function exactConfiguration(configuration) {
  if (configuration?.experimentKind !== "seeded_tournament_exploration") {
    throw new Error("Unsupported prospective experiment kind");
  }
  if (!Number.isInteger(configuration.width) || configuration.width < 3 || configuration.width > 7) {
    throw new Error("width must be an integer from 3 to 7");
  }
  if (!Number.isInteger(configuration.sampleCount) || configuration.sampleCount < 1) {
    throw new Error("sampleCount must be a positive integer");
  }
  const relabeling = configuration.relabeling;
  if (!Array.isArray(relabeling) || relabeling.length !== configuration.width
    || [...relabeling].sort((a, b) => a - b).some((value, index) => value !== index)) {
    throw new Error("relabeling must be a permutation of every vertex");
  }
  if (configuration.generator?.name !== "lcg32"
    || !Number.isInteger(configuration.generator.multiplier)
    || !Number.isInteger(configuration.generator.increment)) {
    throw new Error("generator must declare integer lcg32 parameters");
  }
}

export async function executeLockedTemporalSample(lock, outputDirectory) {
  verifyProtocolLock(lock);
  const configuration = lock.protocol.model.configuration;
  exactConfiguration(configuration);
  const modelContentHash = await computeModelContentHash();
  const execution = prepareExecution(lock, {
    protocolHash: lock.protocolHash,
    modelContentHash,
    observableIds: lock.protocol.observables.map(({ id }) => id),
    controlIds: lock.protocol.controls.map(({ id }) => id),
    observer: lock.protocol.observer,
    seed: lock.protocol.seed,
  });
  const guard = createAccessGuard(lock, execution);
  const samples = [];
  const histogram = {};
  let maximum = 0;
  let numeratorSum = 0;
  let relabelMismatches = 0;
  let reversalMismatches = 0;

  for (const mask of generateMasks(configuration, lock.protocol.seed)) {
    const engine = createEngine(temporalFrustrationPlugin, {
      width: configuration.width,
      observer: lock.protocol.observer,
      seed: lock.protocol.seed,
    });
    engine.operate("load_tournament", { mask });
    guard.authorize("inspect_local_summary");
    const local = engine.observe("local_summary");
    guard.authorize("optimize_scalar_order");
    const original = engine.observe("minimum_frustration");
    engine.perturb("relabel_vertices", { permutation: configuration.relabeling });
    guard.authorize("optimize_scalar_order");
    const relabelled = engine.observe("minimum_frustration");
    engine.perturb("reverse_relations");
    guard.authorize("optimize_scalar_order");
    const reversed = engine.observe("minimum_frustration");

    if (original.minimumViolations !== relabelled.minimumViolations) relabelMismatches += 1;
    if (original.minimumViolations !== reversed.minimumViolations) reversalMismatches += 1;
    maximum = Math.max(maximum, original.minimumViolations);
    numeratorSum += original.minimumViolations;
    histogram[String(original.minimumViolations)] = (histogram[String(original.minimumViolations)] ?? 0) + 1;
    samples.push({
      mask,
      local,
      originalMinimum: original.minimumViolations,
      relabelledMinimum: relabelled.minimumViolations,
      reversedMinimum: reversed.minimumViolations,
    });
  }

  const representationMismatches = relabelMismatches + reversalMismatches;
  const raw = sealRawResults(lock, execution, {
    observables: {
      sample_records: samples,
      frustration_histogram: histogram,
      maximum_backward_edges: maximum,
      mean_backward_edges_numerator: numeratorSum,
      representation_mismatches: representationMismatches,
    },
    controls: {
      relabel_invariance: { passed: relabelMismatches === 0, mismatches: relabelMismatches },
      reversal_invariance: { passed: reversalMismatches === 0, mismatches: reversalMismatches },
    },
  }, guard.snapshot());
  const classification = evaluateLockedReversals(lock, raw);
  const pairCount = configuration.width * (configuration.width - 1) / 2;
  const computed = {
    protocolHash: lock.protocolHash,
    rawHash: raw.rawHash,
    sampleCount: configuration.sampleCount,
    pairCount,
    histogram,
    maximumBackwardEdges: maximum,
    meanBackwardEdges: `${numeratorSum}/${configuration.sampleCount}`,
    meanFrustration: `${numeratorSum}/${configuration.sampleCount * pairCount}`,
  };
  const comparison = {
    protocolHash: lock.protocolHash,
    rawHash: raw.rawHash,
    controls: raw.controls,
    allControlsPassed: Object.values(raw.controls).every(({ passed }) => passed),
  };

  await mkdir(outputDirectory, { recursive: false });
  await Promise.all([
    writeFile(resolve(outputDirectory, "raw_results.json"), JSON.stringify(raw, null, 2) + "\n", { flag: "wx" }),
    writeFile(resolve(outputDirectory, "computed_output.json"), JSON.stringify(computed, null, 2) + "\n", { flag: "wx" }),
    writeFile(resolve(outputDirectory, "comparison.json"), JSON.stringify(comparison, null, 2) + "\n", { flag: "wx" }),
    writeFile(resolve(outputDirectory, "classification.json"), JSON.stringify(classification, null, 2) + "\n", { flag: "wx" }),
  ]);
  return { raw, computed, comparison, classification };
}

async function main() {
  const [lockPath, outputDirectory] = process.argv.slice(2);
  if (!lockPath || !outputDirectory) {
    console.error("Usage: temporal-seeded-sample.mjs PROTOCOL.lock.json NEW_OUTPUT_DIRECTORY");
    process.exit(2);
  }
  const lock = JSON.parse(await readFile(lockPath, "utf8"));
  const result = await executeLockedTemporalSample(lock, outputDirectory);
  console.log(`protocol_hash=${result.raw.protocolHash}`);
  console.log(`raw_hash=${result.raw.rawHash}`);
  console.log(`classification=${result.classification.status}`);
}

if (process.argv[1] && resolve(process.argv[1]) === adapterPath) await main();
