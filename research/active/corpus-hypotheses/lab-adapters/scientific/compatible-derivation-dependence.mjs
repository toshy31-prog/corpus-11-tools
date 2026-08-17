#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { maximalContexts } from "./compatible-constraint-order.mjs";
import { createAccessGuard, evaluateLockedReversals, prepareExecution, sealRawResults } from "../../../../../corpus-11-tools/labs/experiment-lab/governance/protocol-lock.mjs";
import { buildExecutionDescriptor, createExecutionLock, verifyExecutionLock } from "../../../../../corpus-11-tools/labs/experiment-lab/governance/execution-lock.mjs";

const runnerPath = fileURLToPath(import.meta.url);
const labDirectory = resolve(dirname(runnerPath), "..");
const engineFiles = ["governance/execution-lock.mjs", "governance/protocol-lock.mjs",
  "scientific/compatible-constraint-order.mjs", "scientific/compatible-derivation-dependence.mjs"];

function pairs(width) {
  const output = [];
  for (let left = 0; left < width; left += 1) for (let right = left + 1; right < width; right += 1) output.push([left, right]);
  return output;
}

function popcount(value) {
  return value.toString(2).replaceAll("0", "").length;
}

function degreeSequence(width, graphMask) {
  const degrees = Array(width).fill(0);
  pairs(width).forEach(([left, right], index) => { if ((graphMask >> index) & 1) { degrees[left] += 1; degrees[right] += 1; } });
  return degrees.sort((a, b) => a - b);
}

function triangleCount(width, graphMask) {
  const edgeIndex = new Map(pairs(width).map(([left, right], index) => [`${left},${right}`, index]));
  const adjacent = (left, right) => Boolean((graphMask >> edgeIndex.get(`${Math.min(left, right)},${Math.max(left, right)}`)) & 1);
  let count = 0;
  for (let a = 0; a < width; a += 1) for (let b = a + 1; b < width; b += 1) for (let c = b + 1; c < width; c += 1) {
    if (adjacent(a, b) && adjacent(a, c) && adjacent(b, c)) count += 1;
  }
  return count;
}

function relabelMask(width, graphMask, permutation) {
  const edgeList = pairs(width);
  const targetIndex = new Map(edgeList.map(([left, right], index) => [`${left},${right}`, index]));
  let output = 0;
  edgeList.forEach(([left, right], index) => {
    if (!((graphMask >> index) & 1)) return;
    const mapped = [permutation[left], permutation[right]].sort((a, b) => a - b);
    output |= 1 << targetIndex.get(`${mapped[0]},${mapped[1]}`);
  });
  return output;
}

function derivedRelation(width, contexts, excludeAbsent = false) {
  const supports = Array.from({ length: width }, (_, vertex) => contexts.reduce((bits, context, index) => bits | (((context >> vertex) & 1) << index), 0));
  let relationMask = 0;
  let strictPairs = 0;
  let cursor = 0;
  for (let left = 0; left < width; left += 1) for (let right = 0; right < width; right += 1) {
    if (left === right) continue;
    const proper = supports[left] !== supports[right] && (supports[left] & supports[right]) === supports[left];
    if (proper && (!excludeAbsent || (supports[left] !== 0 && supports[right] !== 0))) {
      relationMask |= 1 << cursor; strictPairs += 1;
    }
    cursor += 1;
  }
  return { relationMask, strictPairs };
}

export function compareDerivationRules(width, graphMask) {
  const maximal = maximalContexts(width, graphMask);
  const largestSize = Math.max(...maximal.map(popcount));
  const maximum = maximal.filter((context) => popcount(context) === largestSize);
  const original = derivedRelation(width, maximal);
  const variant = derivedRelation(width, maximum, true);
  return { original, variant, maximalContextSizes: maximal.map(popcount).sort((a, b) => a - b) };
}

function matchedKey(width, graphMask, contextSizes) {
  return JSON.stringify([degreeSequence(width, graphMask), triangleCount(width, graphMask), contextSizes]);
}

export function enumerateDerivationDependence(width, permutation) {
  const graphCount = 2 ** (width * (width - 1) / 2);
  let originalNontrivial = 0;
  let variantNontrivial = 0;
  let exactPersistence = 0;
  let changed = 0;
  let disappearance = 0;
  let appearance = 0;
  let representationMismatches = 0;
  const matched = new Map();
  for (let mask = 0; mask < graphCount; mask += 1) {
    const result = compareDerivationRules(width, mask);
    if (result.original.strictPairs > 0) originalNontrivial += 1;
    if (result.variant.strictPairs > 0) variantNontrivial += 1;
    if (result.original.relationMask === result.variant.relationMask) exactPersistence += 1;
    else changed += 1;
    if (result.original.strictPairs > 0 && result.variant.strictPairs === 0) disappearance += 1;
    if (result.original.strictPairs === 0 && result.variant.strictPairs > 0) appearance += 1;
    const relabelled = compareDerivationRules(width, relabelMask(width, mask, permutation));
    if (result.original.strictPairs !== relabelled.original.strictPairs || result.variant.strictPairs !== relabelled.variant.strictPairs) representationMismatches += 1;
    const key = matchedKey(width, mask, result.maximalContextSizes);
    if (!matched.has(key)) matched.set(key, new Set());
    matched.get(key).add(`${result.variant.strictPairs}`);
  }
  const discriminatingMatchedClasses = [...matched.values()].filter((signatures) => signatures.size > 1).length;
  const empty = compareDerivationRules(width, 0);
  const complete = compareDerivationRules(width, graphCount - 1);
  const extremeControlMismatches = Number(empty.variant.strictPairs !== 0) + Number(complete.variant.strictPairs !== 0);
  return { graphCount, originalNontrivial, variantNontrivial, exactPersistence, changed, disappearance, appearance,
    discriminatingMatchedClasses, representationMismatches, extremeControlMismatches };
}

export async function computeDerivationModelHash() {
  const hash = createHash("sha256");
  for (const path of [runnerPath, resolve(labDirectory, "scientific/compatible-constraint-order.mjs")]) hash.update(await readFile(path));
  return `sha256:${hash.digest("hex")}`;
}

export async function captureDerivationDescriptor() {
  return buildExecutionDescriptor({
    engine: { id: "compatible-derivation-dependence-runner", version: "1.0.0", files: engineFiles.map((id) => ({ id, path: resolve(labDirectory, id) })) },
    module: { id: "compatible-maximum-context-rule", version: "1.0.0", files: [{ id: "scientific/compatible-derivation-dependence.mjs", path: runnerPath }] },
  });
}

export async function executeDerivationDependence(protocolLock, executionLock, outputDirectory) {
  const descriptor = await captureDerivationDescriptor();
  verifyExecutionLock(protocolLock, executionLock, descriptor);
  const config = protocolLock.protocol.model.configuration;
  if (config?.experimentKind !== "compatible_derivation_rule_dependence" || config.width !== 6) throw new Error("Unsupported configuration");
  const execution = prepareExecution(protocolLock, { protocolHash: protocolLock.protocolHash,
    modelContentHash: await computeDerivationModelHash(), observableIds: protocolLock.protocol.observables.map(({ id }) => id),
    controlIds: protocolLock.protocol.controls.map(({ id }) => id), observer: protocolLock.protocol.observer, seed: protocolLock.protocol.seed });
  const guard = createAccessGuard(protocolLock, execution);
  guard.authorize("enumerate_universe"); guard.authorize("compute_original_rule"); guard.authorize("compute_variant_rule");
  const result = enumerateDerivationDependence(config.width, config.relabeling);
  guard.authorize("compare_rules"); guard.authorize("apply_matched_controls"); guard.authorize("audit_representation");
  const enumerationMismatches = Number(result.graphCount !== config.expectedGraphCount);
  const raw = sealRawResults(protocolLock, execution, { observables: {
    original_nontrivial_order_graphs: result.originalNontrivial,
    variant_nontrivial_order_graphs: result.variantNontrivial,
    exact_relation_persistence_graphs: result.exactPersistence,
    rule_changed_graphs: result.changed,
    order_disappearance_graphs: result.disappearance,
    order_appearance_graphs: result.appearance,
    variant_discriminating_matched_classes: result.discriminatingMatchedClasses,
    enumeration_mismatches: enumerationMismatches,
    representation_mismatches: result.representationMismatches,
    extreme_control_mismatches: result.extremeControlMismatches,
  }, controls: {
    exhaustive_universe: { passed: enumerationMismatches === 0, graphCount: result.graphCount },
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
  if (command === "model-hash") { console.log(await computeDerivationModelHash()); return; }
  if (!command || !protocolPath || !executionPath) throw new Error("Usage: compatible-derivation-dependence.mjs model-hash | lock PROTOCOL EXECUTION | run PROTOCOL EXECUTION OUTPUT");
  const protocolLock = JSON.parse(await readFile(protocolPath, "utf8"));
  if (command === "lock") { const lock = createExecutionLock(protocolLock, await captureDerivationDescriptor()); await writeFile(executionPath, JSON.stringify(lock, null, 2) + "\n", { flag: "wx" }); console.log(lock.experimentFingerprint); return; }
  if (command === "run" && outputDirectory) { const executionLock = JSON.parse(await readFile(executionPath, "utf8")); const result = await executeDerivationDependence(protocolLock, executionLock, outputDirectory); console.log(result.classification.status); return; }
  throw new Error(`Unsupported command: ${command}`);
}

if (process.argv[1] && resolve(process.argv[1]) === runnerPath) await main();
