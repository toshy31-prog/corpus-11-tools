#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalStringify } from "../../../../corpus-11-tools/labs/experiment-lab/core/reproducibility.mjs";
import { createDeclarativeScenario } from "../../../../corpus-11-tools/labs/experiment-lab/arena/declarative/adapter.mjs";
import { runBlindArena } from "../../../../corpus-11-tools/labs/experiment-lab/arena/runner.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, "runs", "public");
const sealedDir = join(here, "runs", "sealed");
const registryPath = join(here, "submissions", "registry.json");
const contenderPath = join(here, "contenders", "frozen.json");

function sha256(value) {
  return `sha256:${createHash("sha256").update(canonicalStringify(value)).digest("hex")}`;
}

function verifyContenders(document) {
  const freeze = document.freeze;
  const payload = structuredClone(document);
  delete payload.freeze;
  if (freeze?.algorithm !== "sha256" || freeze.contentHash !== sha256(payload)) {
    throw new Error("contender freeze mismatch");
  }
  if (!Array.isArray(payload.contenders) || payload.contenders.length < 2) throw new Error("at least two frozen contenders required");
  return payload;
}

function normalize(value) {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function numericValues(value) {
  if (Number.isFinite(value)) return [Number(value)];
  if (Array.isArray(value)) return value.flatMap(numericValues);
  if (value && typeof value === "object") return Object.values(value).flatMap(numericValues);
  return [];
}

function buildContender(spec, predictionKeys) {
  return {
    manifest: { id: spec.id, version: spec.version, title: spec.title, family: spec.family },
    decide({ view, allowedActions, history }) {
      const actionScores = allowedActions.map((action) => {
        const normalized = normalize(action);
        const lexical = Object.entries(spec.keywords).reduce((sum, [keyword, weight]) => (
          normalized.includes(normalize(keyword)) ? sum + weight : sum
        ), 0);
        const repeats = history.filter((item) => item.action === action).length;
        return { action, score: lexical - repeats * spec.repeatPenalty };
      }).sort((left, right) => right.score - left.score || left.action.localeCompare(right.action));
      const action = actionScores[0].action;
      const visible = numericValues(view);
      const prior = history.length ? numericValues(history.at(-1).observation) : [];
      const values = visible.length ? visible : prior;
      const estimate = values.length ? values.reduce((sum, item) => sum + item, 0) / values.length : 0;
      return { action, predictions: Object.fromEntries(predictionKeys.map((key) => [key, estimate])) };
    },
  };
}

function thresholdBreaches(document, outcomes) {
  const envelope = document.campaignEnvelope;
  return Object.entries(envelope.dimensionMap).filter(([axis, dimension]) => {
    const threshold = envelope.nonCompensableThresholds[axis] ?? envelope.nonCompensableThresholds[dimension];
    const value = outcomes[dimension];
    return threshold.operator === "gt" ? value > threshold.value
      : threshold.operator === "gte" ? value >= threshold.value
        : threshold.operator === "lt" ? value < threshold.value : value <= threshold.value;
  }).map(([axis]) => axis);
}

function meanPredictionError(history) {
  const values = history.flatMap((item) => Object.values(item.predictionAssessment).filter(Number.isFinite));
  return values.length ? values.reduce((sum, item) => sum + item, 0) / values.length : null;
}

function pairwiseVectorRelations(runs, dimensions, orientations) {
  const pairs = [];
  for (let i = 0; i < runs.length; i += 1) for (let j = i + 1; j < runs.length; j += 1) {
    const left = runs[i]; const right = runs[j];
    const axes = Object.fromEntries(Object.entries(dimensions).map(([axis, dimension]) => {
      const l = left.outcomes[dimension]; const r = right.outcomes[dimension];
      if (l === r) return [axis, "equal"];
      const leftBetter = orientations[axis] === "min" ? l < r : l > r;
      return [axis, leftBetter ? "left_better" : "right_better"];
    }));
    pairs.push({ left: left.label, right: right.label, axes });
  }
  return pairs;
}

async function runPhase() {
  const blindKey = process.env.CCT_BLIND_KEY;
  if (!blindKey || blindKey.length < 16) throw new Error("CCT_BLIND_KEY of at least 16 characters is required");
  const registry = JSON.parse(await readFile(registryPath, "utf8"));
  const admitted = registry.entries.filter((entry) => entry.status === "admitted");
  if (admitted.length !== registry.required_count || admitted.length !== 8) throw new Error("campaign does not contain exactly eight admitted worlds");
  const contenderDocument = JSON.parse(await readFile(contenderPath, "utf8"));
  const contenderSet = verifyContenders(contenderDocument);
  await mkdir(publicDir, { recursive: true }); await mkdir(sealedDir, { recursive: true });
  const summaries = []; let identityMap = null;
  for (const entry of admitted) {
    const path = join(here, "submissions", entry.path);
    const document = JSON.parse(await readFile(path, "utf8"));
    const scenario = createDeclarativeScenario(document);
    const contenders = contenderSet.contenders.map((spec) => buildContender(spec, Object.keys(document.predictionTargets ?? {})));
    const result = runBlindArena({
      arenaId: `CCT-HO-001:${document.manifest.id}`,
      scenario,
      contenders,
      seed: 0,
      blindKey,
      claimExternal: false,
    });
    if (identityMap && canonicalStringify(identityMap) !== canonicalStringify(result.sealedIdentityMap)) throw new Error("identity map changed across worlds");
    identityMap = result.sealedIdentityMap;
    await writeFile(join(publicDir, `${document.manifest.id}.report.json`), `${JSON.stringify(result.report, null, 2)}\n`, "utf8");
    const dimensions = document.campaignEnvelope.dimensionMap;
    const orientations = document.campaignEnvelope.dimensionOrientation;
    summaries.push({
      scenarioId: document.manifest.id,
      scenarioFreezeHash: entry.freeze_hash,
      dependenceStatus: entry.dependence_status ?? registry.campaign_independence_status,
      runs: result.report.runs.map((run) => ({
        label: run.label,
        outcomes: run.outcomes,
        thresholdBreaches: thresholdBreaches(document, run.outcomes),
        meanPredictionAbsoluteError: meanPredictionError(run.history),
        actions: run.history.map((item) => item.action),
      })),
      pairwiseVectorRelations: pairwiseVectorRelations(result.report.runs, dimensions, orientations),
    });
  }
  const publicSummary = {
    campaignId: "CCT-HO-001",
    status: "synthetic_common_generator_non_independent",
    contenderFreezeHash: contenderDocument.freeze.contentHash,
    identityStatus: "sealed",
    conclusionBoundary: "per-world_vector_relations_and_threshold_breaches_only_no_scalar_winner",
    worlds: summaries,
  };
  await writeFile(join(publicDir, "blind-summary.json"), `${JSON.stringify(publicSummary, null, 2)}\n`, "utf8");
  await writeFile(join(sealedDir, "identity-map.json"), `${JSON.stringify({ campaignId: "CCT-HO-001", identityMap }, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ phase: "run_blind", worlds: summaries.length, labels: Object.keys(identityMap), publicSummaryHash: sha256(publicSummary) }, null, 2));
}

async function revealPhase() {
  const blind = JSON.parse(await readFile(join(publicDir, "blind-summary.json"), "utf8"));
  const sealed = JSON.parse(await readFile(join(sealedDir, "identity-map.json"), "utf8"));
  const revealed = structuredClone(blind);
  revealed.identityStatus = "revealed_after_vector_verdict";
  revealed.identityMap = sealed.identityMap;
  for (const world of revealed.worlds) {
    for (const run of world.runs) run.contenderId = sealed.identityMap[run.label];
    for (const pair of world.pairwiseVectorRelations) {
      pair.leftContenderId = sealed.identityMap[pair.left]; pair.rightContenderId = sealed.identityMap[pair.right];
    }
  }
  await writeFile(join(here, "runs", "revealed-summary.json"), `${JSON.stringify(revealed, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ phase: "reveal_after_vector_verdict", worlds: revealed.worlds.length, revealedHash: sha256(revealed) }, null, 2));
}

const phase = process.argv[2];
if (phase === "run") await runPhase();
else if (phase === "reveal") await revealPhase();
else throw new Error("usage: node execute-campaign.mjs run|reveal");
