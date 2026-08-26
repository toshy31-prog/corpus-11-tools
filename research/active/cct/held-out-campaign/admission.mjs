#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createDeclarativeScenario } from "../../../../corpus-11-tools/labs/experiment-lab/arena/declarative/adapter.mjs";
import { validateScenario } from "../../../../corpus-11-tools/labs/experiment-lab/arena/contracts.mjs";

export const REQUIRED_AXES = [
  "besoins_vitaux",
  "plafond_ecologique",
  "droits",
  "attribution_du_pouvoir",
  "portabilite_effective",
  "recuperation",
];

export const KNOWN_V1_WORLDS = [
  "dependency-monopoly",
  "emergency-capture",
  "fragmentation-cascade",
  "ecological-evasion",
  "local-domination",
  "information-siege",
];

function assert(condition, message) {
  if (!condition) throw new Error(`CCT held-out admission refused: ${message}`);
}

function containsPlaceholder(value) {
  return typeof value === "string" && /replace[-_ ]with|replace_/i.test(value);
}

export function admitDocument(document) {
  const scenario = createDeclarativeScenario(document);
  validateScenario(scenario, { claimExternal: true });
  const envelope = document.campaignEnvelope;
  assert(envelope?.protocolVersion === "cct-held-out-campaign/v1", "campaign protocol version is missing");

  const declaration = envelope.independenceDeclaration;
  assert(declaration?.declaresNoAccessToCandidateV013 === true, "author did not declare candidate separation");
  assert(declaration?.contenderIdentitiesWithheldUntilFreeze === true, "contenders were not withheld until freeze");
  assert(declaration?.notDerivedFromKnownV1Worlds === true, "author did not exclude derivation from v1 worlds");
  assert(JSON.stringify(declaration.knownV1Worlds) === JSON.stringify(KNOWN_V1_WORLDS), "known v1 world registry is incomplete");

  const serializedIdentity = `${document.manifest.id} ${document.manifest.title}`.toLowerCase();
  assert(!KNOWN_V1_WORLDS.some((name) => serializedIdentity.includes(name)), "scenario reuses a known v1 world identity");
  assert(!containsPlaceholder(document.manifest.id), "scenario id is still a placeholder");
  assert(!containsPlaceholder(document.source.authorId), "author id is still a placeholder");
  assert(!containsPlaceholder(document.source.authorshipTrace), "authorship trace is still a placeholder");

  const matching = envelope.matching;
  for (const key of ["sameInitialWorld", "sameExogenousSequence", "sameInformationBudget", "sameActionBudget"]) {
    assert(matching?.[key] === true, `matching.${key} must be true`);
  }
  assert(Number.isInteger(matching.actionUnitsPerRound) && matching.actionUnitsPerRound > 0, "positive action budget is required");
  assert(envelope.thresholdsAuthoredBeforeContenders === true, "thresholds were not fixed before contenders");
  assert(envelope.scalarWinnerForbidden === true, "scalar winner must be forbidden");

  const dimensionMap = envelope.dimensionMap ?? {};
  assert(REQUIRED_AXES.every((axis) => typeof dimensionMap[axis] === "string"), "six constitutional axes must be mapped");
  const mapped = REQUIRED_AXES.map((axis) => dimensionMap[axis]);
  assert(new Set(mapped).size === REQUIRED_AXES.length, "constitutional axes must map to distinct dimensions");
  assert(mapped.every((name) => document.manifest.dimensions.includes(name) && Object.hasOwn(document.outcomes, name)), "mapped dimensions must exist in manifest and outcomes");
  assert(!document.manifest.dimensions.includes("winner") && !document.manifest.dimensions.includes("aggregateScore"), "hidden scalar outcome is forbidden");
  const suppliedOrientations = envelope.dimensionOrientation ?? {};
  const orientations = Object.fromEntries(REQUIRED_AXES.map((axis) => [
    axis, suppliedOrientations[axis] ?? suppliedOrientations[dimensionMap[axis]],
  ]));
  assert(REQUIRED_AXES.every((axis) => ["min", "max"].includes(orientations[axis])), "each constitutional axis requires an explicit min|max orientation");
  const suppliedThresholds = envelope.nonCompensableThresholds ?? {};
  const thresholds = Object.fromEntries(REQUIRED_AXES.map((axis) => [
    axis, suppliedThresholds[axis] ?? suppliedThresholds[dimensionMap[axis]],
  ]));
  assert(REQUIRED_AXES.every((axis) => ["gt", "gte", "lt", "lte"].includes(thresholds[axis]?.operator)
    && Number.isFinite(thresholds[axis]?.value)), "each constitutional axis requires a finite non-compensable threshold and operator");
  assert(REQUIRED_AXES.every((axis) => orientations[axis] === "min"
    ? ["gt", "gte"].includes(thresholds[axis].operator)
    : ["lt", "lte"].includes(thresholds[axis].operator)),
  "threshold breach direction must match the declared outcome orientation");
  const prediction = envelope.preExecutionPrediction;
  assert(typeof prediction?.nonCctRivalMayBeFavored === "boolean" && typeof prediction?.reason === "string"
    && prediction.reason.trim().length >= 12 && !containsPlaceholder(prediction.reason), "pre-execution rival prediction and concrete reason are required");

  // Admission includes an executable dry run for every action. Structural
  // parsing alone would otherwise accept unsupported mutations or dead paths.
  for (const action of Object.keys(document.actions)) {
    const trial = scenario.createTrial({ seed: 0 });
    const history = [];
    for (let round = 0; round < scenario.manifest.rounds; round += 1) {
      const view = scenario.project({ world: trial.world, round, history });
      const allowed = scenario.admissibleActions({ view, round });
      assert(allowed.includes(action), `action ${action} is not admissible at round ${round}`);
      scenario.act({ world: trial.world, action, round, exogenous: trial.exogenous });
      const observed = scenario.observe({ world: trial.world, round });
      history.push({ round, action, view, observed });
    }
    const outcomes = scenario.close({ world: trial.world, history });
    assert(Object.values(outcomes).every(Number.isFinite), `action ${action} produces a non-finite outcome`);
  }

  return {
    admitted: true,
    scenarioId: document.manifest.id,
    freezeHash: scenario.manifest.source.freezeHash,
    externalityStatus: "declared_external_authorship_not_independently_verified",
    mappedAxes: dimensionMap,
    orientations,
    nonCompensableThresholds: thresholds,
    preExecutionPrediction: prediction,
  };
}

export async function admitPath(path) {
  const document = JSON.parse(await readFile(resolve(path), "utf8"));
  return admitDocument(document);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [path] = process.argv.slice(2);
  if (!path) throw new Error("usage: node admission.mjs frozen-scenario.json");
  console.log(JSON.stringify(await admitPath(path), null, 2));
}
