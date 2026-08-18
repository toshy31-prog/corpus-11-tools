#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { maximalContexts } from "./compatible-constraint-order.mjs";
import { createAccessGuard, evaluateLockedReversals, prepareExecution, sealRawResults } from "../../../../../corpus-11-tools/labs/experiment-lab/governance/protocol-lock.mjs";
import { buildExecutionDescriptor, createExecutionLock } from "../../../../../corpus-11-tools/labs/experiment-lab/governance/execution-lock.mjs";
import { closeLockedExecution } from "../../../../../corpus-11-tools/labs/experiment-lab/governance/execution-closure.mjs";

const runnerPath = fileURLToPath(import.meta.url);
const scientificDirectory = dirname(runnerPath);
const experimentLabDirectory = resolve(scientificDirectory, "../../../../../corpus-11-tools/labs/experiment-lab");
const compatibleOrderPath = resolve(scientificDirectory, "compatible-constraint-order.mjs");
const engineFiles = [
  { id: "corpus/governance/execution-closure.mjs", path: resolve(experimentLabDirectory, "governance/execution-closure.mjs") },
  { id: "corpus/governance/execution-lock.mjs", path: resolve(experimentLabDirectory, "governance/execution-lock.mjs") },
  { id: "corpus/governance/protocol-lock.mjs", path: resolve(experimentLabDirectory, "governance/protocol-lock.mjs") },
];
const moduleFiles = [
  { id: "research/scientific/compatible-constraint-order.mjs", path: compatibleOrderPath },
  { id: "research/scientific/compatible-rule-family.mjs", path: runnerPath },
];
const artifactNames = ["raw_results.json", "classification.json"];

export const RULE_FAMILY = Object.freeze([
  { id: "all_maximal", primitiveCount: 0, selector: "all" },
  { id: "largest_contexts", primitiveCount: 1, selector: "size_max" },
  { id: "smallest_contexts", primitiveCount: 1, selector: "size_min" },
  { id: "highest_overlap", primitiveCount: 2, selector: "overlap_max" },
  { id: "lowest_overlap", primitiveCount: 2, selector: "overlap_min" },
]);

function popcount(value) { return (value >>> 0).toString(2).replaceAll("0", "").length; }

function makeRandom(seed) {
  let state = Number(seed) >>> 0;
  return () => (state = (Math.imul(1664525, state) + 1013904223) >>> 0);
}

function shuffled(values, random) {
  const output = [...values];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const target = random() % (index + 1);
    [output[index], output[target]] = [output[target], output[index]];
  }
  return output;
}

function selectContexts(contexts, selector) {
  if (selector === "all") return [...contexts];
  const sizes = contexts.map(popcount);
  const overlaps = contexts.map((context, index) => contexts.reduce((sum, other, otherIndex) => sum + (index === otherIndex ? 0 : popcount(context & other)), 0));
  const scores = selector.startsWith("size") ? sizes : overlaps;
  const target = selector.endsWith("max") ? Math.max(...scores) : Math.min(...scores);
  return contexts.filter((_, index) => scores[index] === target);
}

function relation(width, contexts) {
  const supports = Array.from({ length: width }, (_, vertex) => contexts.reduce((bits, context, index) => bits | (((context >> vertex) & 1) << index), 0));
  let mask = 0;
  let cursor = 0;
  for (let left = 0; left < width; left += 1) for (let right = 0; right < width; right += 1) {
    if (left === right) continue;
    if (supports[left] !== 0 && supports[right] !== 0 && supports[left] !== supports[right]
      && (supports[left] & supports[right]) === supports[left]) mask |= 1 << cursor;
    cursor += 1;
  }
  return mask >>> 0;
}

function relabelMask(width, graphMask, permutation) {
  const pairs = [];
  for (let left = 0; left < width; left += 1) for (let right = left + 1; right < width; right += 1) pairs.push([left, right]);
  const targetIndex = new Map(pairs.map(([left, right], index) => [`${left},${right}`, index]));
  let output = 0;
  pairs.forEach(([left, right], index) => {
    if (!((graphMask >> index) & 1)) return;
    const mapped = [permutation[left], permutation[right]].sort((a, b) => a - b);
    output |= 1 << targetIndex.get(`${mapped[0]},${mapped[1]}`);
  });
  return output;
}

export function evaluateRuleFamily(width, graphMask, random) {
  const contexts = maximalContexts(width, graphMask);
  const deterministic = RULE_FAMILY.map((rule) => {
    const selected = selectContexts(contexts, rule.selector);
    return { id: rule.id, count: selected.length, relation: relation(width, selected) };
  });
  let randomMatchingMismatches = 0;
  const controls = deterministic.map(({ id, count }) => {
    const selected = shuffled(contexts, random).slice(0, count);
    if (selected.length !== count) randomMatchingMismatches += 1;
    return { id, count, relation: relation(width, selected) };
  });
  const deterministicCore = deterministic.reduce((core, item) => core & item.relation, 0x3fffffff) >>> 0;
  const randomCore = controls.reduce((core, item) => core & item.relation, 0x3fffffff) >>> 0;
  const union = deterministic.reduce((value, item) => value | item.relation, 0) >>> 0;
  const selectedRule = [...RULE_FAMILY].sort((left, right) => left.primitiveCount - right.primitiveCount || left.id.localeCompare(right.id))[0].id;
  const selectedRelation = deterministic.find(({ id }) => id === selectedRule).relation;
  return { deterministic, controls, deterministicCore, randomCore, union, selectedRule, selectedRelation, randomMatchingMismatches };
}

export function enumerateRuleFamily(width, permutation, seed) {
  const graphCount = 2 ** (width * (width - 1) / 2);
  const random = makeRandom(seed);
  let exactInvariantGraphs = 0;
  let commonCoreGraphs = 0;
  let completeConventionDependenceGraphs = 0;
  let commonCorePairs = 0;
  let randomCorePairs = 0;
  let selectedRulePairs = 0;
  let selectedOutsideCorePairs = 0;
  let representationMismatches = 0;
  let randomMatchingMismatches = 0;
  for (let mask = 0; mask < graphCount; mask += 1) {
    const result = evaluateRuleFamily(width, mask, random);
    const first = result.deterministic[0].relation;
    if (result.deterministic.every((item) => item.relation === first)) exactInvariantGraphs += 1;
    if (result.deterministicCore !== 0) commonCoreGraphs += 1;
    if (result.union !== 0 && result.deterministicCore === 0) completeConventionDependenceGraphs += 1;
    commonCorePairs += popcount(result.deterministicCore);
    randomCorePairs += popcount(result.randomCore);
    selectedRulePairs += popcount(result.selectedRelation);
    selectedOutsideCorePairs += popcount(result.selectedRelation & ~result.deterministicCore);
    randomMatchingMismatches += result.randomMatchingMismatches;
    const relabelled = evaluateRuleFamily(width, relabelMask(width, mask, permutation), makeRandom(seed ^ mask));
    if (result.deterministic.some((item, index) => popcount(item.relation) !== popcount(relabelled.deterministic[index].relation))) representationMismatches += 1;
  }
  const empty = evaluateRuleFamily(width, 0, makeRandom(seed));
  const complete = evaluateRuleFamily(width, graphCount - 1, makeRandom(seed));
  const extremeControlMismatches = Number(empty.union !== 0) + Number(complete.union !== 0);
  return { graphCount, selectedRule: RULE_FAMILY[0].id, exactInvariantGraphs, commonCoreGraphs,
    completeConventionDependenceGraphs, commonCorePairs, randomCorePairs,
    commonCoreAdvantage: commonCorePairs - randomCorePairs, selectedRulePairs, selectedOutsideCorePairs,
    representationMismatches, randomMatchingMismatches, extremeControlMismatches };
}

export async function computeRuleFamilyModelHash() {
  const hash = createHash("sha256");
  for (const path of [runnerPath, compatibleOrderPath]) hash.update(await readFile(path));
  return `sha256:${hash.digest("hex")}`;
}

export async function captureRuleFamilyDescriptor() {
  return buildExecutionDescriptor({
    engine: { id: "corpus-experiment-lab-governance", version: "1.0.0", files: engineFiles },
    module: { id: "compatible-admissible-rule-family", version: "1.1.0", files: moduleFiles },
  });
}

async function executeRuleFamilyArtifacts(protocolLock, outputDirectory) {
  const config = protocolLock.protocol.model.configuration;
  if (config?.experimentKind !== "compatible_admissible_rule_family" || config.width !== 6) throw new Error("Unsupported configuration");
  const execution = prepareExecution(protocolLock, { protocolHash: protocolLock.protocolHash,
    modelContentHash: await computeRuleFamilyModelHash(), observableIds: protocolLock.protocol.observables.map(({ id }) => id),
    controlIds: protocolLock.protocol.controls.map(({ id }) => id), observer: protocolLock.protocol.observer, seed: protocolLock.protocol.seed });
  const guard = createAccessGuard(protocolLock, execution);
  guard.authorize("enumerate_universe"); guard.authorize("apply_admissible_rules"); guard.authorize("compute_stable_core");
  guard.authorize("apply_random_matched_rules"); guard.authorize("select_by_simplicity"); guard.authorize("audit_controls");
  const result = enumerateRuleFamily(config.width, config.relabeling, protocolLock.protocol.seed);
  const enumerationMismatches = Number(result.graphCount !== config.expectedGraphCount);
  const controlFailure = enumerationMismatches + result.representationMismatches
    + result.randomMatchingMismatches + result.extremeControlMismatches;
  const familyClassificationCode = controlFailure > 0 ? 0
    : result.commonCorePairs === 0 ? 2
      : result.commonCoreAdvantage > 0 ? 1 : 0;
  const raw = sealRawResults(protocolLock, execution, { observables: {
    family_classification_code: familyClassificationCode,
    selected_rule_id: result.selectedRule,
    exact_family_invariant_graphs: result.exactInvariantGraphs,
    common_core_graphs: result.commonCoreGraphs,
    complete_convention_dependence_graphs: result.completeConventionDependenceGraphs,
    common_core_pairs_total: result.commonCorePairs,
    random_common_core_pairs_total: result.randomCorePairs,
    common_core_advantage_over_random: result.commonCoreAdvantage,
    selected_rule_pairs_total: result.selectedRulePairs,
    selected_rule_pairs_outside_core: result.selectedOutsideCorePairs,
    enumeration_mismatches: enumerationMismatches,
    representation_mismatches: result.representationMismatches,
    random_matching_mismatches: result.randomMatchingMismatches,
    extreme_control_mismatches: result.extremeControlMismatches,
  }, controls: {
    exhaustive_universe: { passed: enumerationMismatches === 0, graphCount: result.graphCount },
    simplicity_selection: { passed: result.selectedRule === config.expectedSelectedRule, selectedRule: result.selectedRule },
    representation_invariance: { passed: result.representationMismatches === 0, mismatches: result.representationMismatches },
    random_rule_matching: { passed: result.randomMatchingMismatches === 0, mismatches: result.randomMatchingMismatches },
    empty_complete_negative_controls: { passed: result.extremeControlMismatches === 0, mismatches: result.extremeControlMismatches },
  } }, guard.snapshot());
  const classification = evaluateLockedReversals(protocolLock, raw);
  await mkdir(outputDirectory, { recursive: false });
  for (const [name, value] of Object.entries({ "raw_results.json": raw, "classification.json": classification })) await writeFile(resolve(outputDirectory, name), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
  return { raw, classification };
}

export async function executeRuleFamily(protocolLock, executionLock, outputDirectory) {
  return closeLockedExecution({
    protocolLock,
    executionLock,
    captureExecutionDescriptor: captureRuleFamilyDescriptor,
    execute: executeRuleFamilyArtifacts,
    outputDirectory,
    artifactNames,
  });
}

async function main() {
  const [command, protocolPath, executionPath, outputDirectory] = process.argv.slice(2);
  if (command === "model-hash") { console.log(await computeRuleFamilyModelHash()); return; }
  if (!command || !protocolPath || !executionPath) throw new Error("Usage: compatible-rule-family.mjs model-hash | lock PROTOCOL EXECUTION | run PROTOCOL EXECUTION OUTPUT");
  const protocolLock = JSON.parse(await readFile(protocolPath, "utf8"));
  if (command === "lock") { const lock = createExecutionLock(protocolLock, await captureRuleFamilyDescriptor()); await writeFile(executionPath, JSON.stringify(lock, null, 2) + "\n", { flag: "wx" }); console.log(lock.experimentFingerprint); return; }
  if (command === "run" && outputDirectory) { const executionLock = JSON.parse(await readFile(executionPath, "utf8")); const result = await executeRuleFamily(protocolLock, executionLock, outputDirectory); console.log(result.classification.status); return; }
  throw new Error(`Unsupported command: ${command}`);
}

if (process.argv[1] && resolve(process.argv[1]) === runnerPath) await main();
