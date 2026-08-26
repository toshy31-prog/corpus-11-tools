#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRichScenario } from "../rich-v3/interpreter.mjs";
import { createCctOpenWorldRecoveryContender } from "../../open-world-recovery-v1.2/runtime.mjs";
import { createCheapest, createLowestAxis, createPublicMaximin } from "./contenders.mjs";
import { project } from "./projection.mjs";

const document = JSON.parse(await readFile(new URL("../kryos-bridges-v1.1.1.frozen.json", import.meta.url), "utf8"));
const expectedUrl = new URL("./public-report.json", import.meta.url);
const profiles = ["P1-matched-public-mechanics", "P2-optimistic-harm-omission"];

function contenderSet(keys) {
  return [
    ["K-A", createCctOpenWorldRecoveryContender({ predictionKeys: keys })],
    ["K-B", createCheapest(keys)],
    ["K-C", createPublicMaximin(keys)],
    ["K-D", createLowestAxis(keys)],
  ];
}

function runOne(profileId, code, contender) {
  const scenario = createRichScenario(document);
  const trial = scenario.createTrial({ seed: 12345 });
  const actions = [];
  let failure = null;
  for (let round = 0; round < scenario.manifest.rounds; round += 1) {
    const baseView = scenario.project({ world: structuredClone(trial.world), round, history: actions });
    const allowedActions = scenario.admissibleActions({ view: baseView, round });
    const view = project({ document, baseView, allowedActions, profileId, tick: round });
    try {
      const decision = contender.decide({ view, allowedActions, history: actions, round });
      assert.ok(allowedActions.includes(decision.action));
      actions.push({ round, action: decision.action, phase: decision.governance?.phase ?? "rival_policy" });
      scenario.act({ world: trial.world, action: decision.action, round, exogenous: trial.exogenous });
    } catch (error) {
      failure = { tick: round, code: error.message };
      break;
    }
  }
  const vector = scenario.close({ world: structuredClone(trial.world), history: actions });
  return {
    profileId, contenderCode: code, completedRounds: actions.length, actions, failure,
    outcomeVector: failure ? null : vector,
    prefixVector: failure ? vector : null,
    comparableAtEightRounds: failure === null && actions.length === 8,
  };
}

const runs = [];
for (const profile of profiles) {
  const keys = createRichScenario(document).manifest.predictionKeys;
  for (const [code, contender] of contenderSet(keys)) runs.push(runOne(profile, code, contender));
}

for (const profile of profiles) {
  const group = runs.filter((run) => run.profileId === profile);
  assert.equal(group.length, 4);
  assert.ok(group.filter((run) => run.contenderCode !== "K-A").every((run) => run.completedRounds === 8));
}

const thresholds = Object.fromEntries(document.outcomes.dimensions.map((dimension) => [dimension.id, dimension.failure_threshold]));
const report = {
  schema: "cct-kryos-blind-confrontation/v1",
  generatedAt: "2026-08-26",
  campaign: "CCT-KRYOS-CONFRONTATION-1.2-001",
  worldFreeze: document.freeze.contentHash,
  interpreterFreeze: "CCT-KRYOS-RICH-V3-FREEZE-2026-08-26-01",
  cctFreeze: "CCT-EXEC-1.2-FREEZE-2026-08-26-01",
  projectionContract: "CCT-KRYOS-PROJECTION-001",
  identitiesBlinded: true,
  profiles,
  thresholds,
  runs,
  result: {
    cctCompleteEightRoundPaths: runs.filter((run) => run.contenderCode === "K-A" && run.comparableAtEightRounds).length,
    rivalCompleteEightRoundPaths: runs.filter((run) => run.contenderCode !== "K-A" && run.comparableAtEightRounds).length,
    cctFailures: runs.filter((run) => run.contenderCode === "K-A").map((run) => ({ profileId: run.profileId, failure: run.failure, completedRounds: run.completedRounds })),
    scalarWinner: null,
    materialComparisonBoundary: "Only complete eight-round vectors are comparable. Failed prefixes are preserved but not ranked against final rival vectors."
  },
  strongestConclusion: "The tested CCT-EXEC 1.2 contender suffers a control-path failure before eight rounds under both frozen projection profiles; three matched rivals complete all eight rounds. This is a synthetic Kryos result, not a field or general invalidity claim.",
  statusBoundary: "Frozen synthetic confrontation. No superiority, field validity, authorization, deployment, institutional effect, independent lineage verification or external transport is established."
};

if (process.argv.includes("--check")) {
  const expected = JSON.parse(await readFile(expectedUrl, "utf8"));
  assert.deepEqual(report, expected);
  console.log(JSON.stringify({ valid: true, cctComplete: report.result.cctCompleteEightRoundPaths, rivalComplete: report.result.rivalCompleteEightRoundPaths }, null, 2));
} else process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
