#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createAccessGuard, evaluateLockedReversals, prepareExecution, sealRawResults } from "../governance/protocol-lock.mjs";
import { buildExecutionDescriptor, createExecutionLock, verifyExecutionLock } from "../governance/execution-lock.mjs";

const runnerPath = fileURLToPath(import.meta.url);
const labDirectory = resolve(dirname(runnerPath), "..");
const engineFiles = ["governance/execution-lock.mjs", "governance/protocol-lock.mjs", "scientific/compatible-constraint-order.mjs"];

function edges(width) {
  const output = [];
  for (let left = 0; left < width; left += 1) for (let right = left + 1; right < width; right += 1) output.push([left, right]);
  return output;
}

function adjacent(mask, edgeIndex, left, right) {
  return Boolean((mask >> edgeIndex.get(`${Math.min(left, right)},${Math.max(left, right)}`)) & 1);
}

export function maximalContexts(width, graphMask) {
  const edgeIndex = new Map(edges(width).map(([left, right], index) => [`${left},${right}`, index]));
  const cliques = [];
  for (let subset = 1; subset < 2 ** width; subset += 1) {
    const vertices = Array.from({ length: width }, (_, vertex) => vertex).filter((vertex) => (subset >> vertex) & 1);
    if (vertices.every((left, index) => vertices.slice(index + 1).every((right) => adjacent(graphMask, edgeIndex, left, right)))) cliques.push(subset);
  }
  return cliques.filter((candidate) => !cliques.some((other) => candidate !== other && (candidate & other) === candidate)).sort((a, b) => a - b);
}

function degreeSequence(width, graphMask) {
  const degrees = Array(width).fill(0);
  edges(width).forEach(([left, right], index) => { if ((graphMask >> index) & 1) { degrees[left] += 1; degrees[right] += 1; } });
  return degrees.sort((a, b) => a - b);
}

function triangleCount(width, graphMask) {
  const edgeIndex = new Map(edges(width).map(([left, right], index) => [`${left},${right}`, index]));
  let count = 0;
  for (let a = 0; a < width; a += 1) for (let b = a + 1; b < width; b += 1) for (let c = b + 1; c < width; c += 1) {
    if (adjacent(graphMask, edgeIndex, a, b) && adjacent(graphMask, edgeIndex, a, c) && adjacent(graphMask, edgeIndex, b, c)) count += 1;
  }
  return count;
}

export function orderSignature(width, graphMask) {
  const contexts = maximalContexts(width, graphMask);
  const supports = Array.from({ length: width }, (_, vertex) => contexts.reduce((bits, context, index) => bits | (((context >> vertex) & 1) << index), 0));
  const unique = [...new Set(supports)].sort((a, b) => a - b);
  let strictPairs = 0;
  for (const left of unique) for (const right of unique) if (left !== right && (left & right) === left) strictPairs += 1;
  const height = unique.reduce((best, start) => {
    const visit = (current, seen) => Math.max(seen, ...unique.filter((next) => next !== current && (current & next) === current).map((next) => visit(next, seen + 1)));
    return Math.max(best, visit(start, 1));
  }, 0);
  return { strictPairs, height, quotientSize: unique.length, contextSizes: contexts.map((context) => context.toString(2).replaceAll("0", "").length).sort((a, b) => a - b) };
}

function relabelMask(width, graphMask, permutation) {
  const original = edges(width);
  const targetIndex = new Map(original.map(([left, right], index) => [`${left},${right}`, index]));
  let output = 0;
  original.forEach(([left, right], index) => {
    if (!((graphMask >> index) & 1)) return;
    const mapped = [permutation[left], permutation[right]].sort((a, b) => a - b);
    output |= 1 << targetIndex.get(`${mapped[0]},${mapped[1]}`);
  });
  return output;
}

function matchedKey(width, graphMask, signature) {
  return JSON.stringify([degreeSequence(width, graphMask), triangleCount(width, graphMask), signature.contextSizes]);
}

export function enumerateCompatibleOrders(width, permutation) {
  const graphCount = 2 ** (width * (width - 1) / 2);
  const strictHistogram = {};
  const heightHistogram = {};
  const matched = new Map();
  let nontrivialOrderGraphs = 0;
  let representationMismatches = 0;
  for (let mask = 0; mask < graphCount; mask += 1) {
    const signature = orderSignature(width, mask);
    strictHistogram[signature.strictPairs] = (strictHistogram[signature.strictPairs] ?? 0) + 1;
    heightHistogram[signature.height] = (heightHistogram[signature.height] ?? 0) + 1;
    if (signature.strictPairs > 0) nontrivialOrderGraphs += 1;
    const relabelled = orderSignature(width, relabelMask(width, mask, permutation));
    if (signature.strictPairs !== relabelled.strictPairs || signature.height !== relabelled.height || signature.quotientSize !== relabelled.quotientSize) representationMismatches += 1;
    const key = matchedKey(width, mask, signature);
    if (!matched.has(key)) matched.set(key, new Map());
    const orderKey = `${signature.strictPairs},${signature.height},${signature.quotientSize}`;
    if (!matched.get(key).has(orderKey)) matched.get(key).set(orderKey, mask);
  }
  const discriminating = [...matched.entries()].filter(([, signatures]) => signatures.size > 1);
  const first = discriminating.sort(([left], [right]) => left.localeCompare(right))[0];
  const witness = first ? { matchedKey: JSON.parse(first[0]), signatures: [...first[1].entries()].sort((a, b) => a[1] - b[1]).map(([signature, mask]) => ({ signature, mask })) } : null;
  const empty = orderSignature(width, 0);
  const complete = orderSignature(width, graphCount - 1);
  return { graphCount, nontrivialOrderGraphs, strictHistogram, heightHistogram,
    discriminatingMatchedClasses: discriminating.length, witness, representationMismatches,
    extremeControlMismatches: Number(empty.strictPairs !== 0) + Number(complete.strictPairs !== 0) };
}

export async function computeCompatibleOrderModelHash() {
  return `sha256:${createHash("sha256").update(await readFile(runnerPath)).digest("hex")}`;
}

export async function captureCompatibleOrderDescriptor() {
  return buildExecutionDescriptor({
    engine: { id: "compatible-constraint-order-runner", version: "1.0.0", files: engineFiles.map((id) => ({ id, path: resolve(labDirectory, id) })) },
    module: { id: "compatible-constraint-order-model", version: "1.0.0", files: [{ id: "scientific/compatible-constraint-order.mjs", path: runnerPath }] },
  });
}

export async function executeCompatibleOrder(protocolLock, executionLock, outputDirectory) {
  const descriptor = await captureCompatibleOrderDescriptor();
  verifyExecutionLock(protocolLock, executionLock, descriptor);
  const config = protocolLock.protocol.model.configuration;
  if (config?.experimentKind !== "exhaustive_compatible_constraint_order" || config.width !== 6) throw new Error("Unsupported configuration");
  const execution = prepareExecution(protocolLock, { protocolHash: protocolLock.protocolHash,
    modelContentHash: await computeCompatibleOrderModelHash(), observableIds: protocolLock.protocol.observables.map(({ id }) => id),
    controlIds: protocolLock.protocol.controls.map(({ id }) => id), observer: protocolLock.protocol.observer, seed: protocolLock.protocol.seed });
  const guard = createAccessGuard(protocolLock, execution);
  guard.authorize("enumerate_universe"); guard.authorize("compute_order_observables");
  const result = enumerateCompatibleOrders(config.width, config.relabeling);
  guard.authorize("apply_matched_controls"); guard.authorize("audit_representation");
  const enumerationMismatch = Number(result.graphCount !== config.expectedGraphCount);
  const raw = sealRawResults(protocolLock, execution, { observables: {
    nontrivial_order_graphs: result.nontrivialOrderGraphs,
    strict_pair_histogram: result.strictHistogram,
    height_histogram: result.heightHistogram,
    discriminating_matched_classes: result.discriminatingMatchedClasses,
    canonical_witness: result.witness,
    enumeration_mismatches: enumerationMismatch,
    representation_mismatches: result.representationMismatches,
    extreme_control_mismatches: result.extremeControlMismatches,
  }, controls: {
    exhaustive_universe: { passed: enumerationMismatch === 0, graphCount: result.graphCount },
    matched_local_summaries: { passed: true, fields: ["degree_sequence", "triangle_count", "maximal_context_size_multiset"] },
    representation_invariance: { passed: result.representationMismatches === 0, mismatches: result.representationMismatches },
    empty_complete_negative_controls: { passed: result.extremeControlMismatches === 0, mismatches: result.extremeControlMismatches },
  } }, guard.snapshot());
  const classification = evaluateLockedReversals(protocolLock, raw);
  await mkdir(outputDirectory, { recursive: false });
  for (const [name, value] of Object.entries({ "raw_results.json": raw, "classification.json": classification })) await writeFile(resolve(outputDirectory, name), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
  return { raw, classification };
}

async function main() {
  const [command, protocolPath, executionPath, outputDirectory] = process.argv.slice(2);
  if (command === "model-hash") { console.log(await computeCompatibleOrderModelHash()); return; }
  if (!command || !protocolPath || !executionPath) throw new Error("Usage: compatible-constraint-order.mjs model-hash | lock PROTOCOL EXECUTION | run PROTOCOL EXECUTION OUTPUT");
  const protocolLock = JSON.parse(await readFile(protocolPath, "utf8"));
  if (command === "lock") { const lock = createExecutionLock(protocolLock, await captureCompatibleOrderDescriptor()); await writeFile(executionPath, JSON.stringify(lock, null, 2) + "\n", { flag: "wx" }); console.log(lock.experimentFingerprint); return; }
  if (command === "run" && outputDirectory) { const executionLock = JSON.parse(await readFile(executionPath, "utf8")); const result = await executeCompatibleOrder(protocolLock, executionLock, outputDirectory); console.log(result.classification.status); return; }
  throw new Error(`Unsupported command: ${command}`);
}

if (process.argv[1] && resolve(process.argv[1]) === runnerPath) await main();
