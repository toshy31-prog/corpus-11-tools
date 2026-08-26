import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalStringify } from "../../../../corpus-11-tools/labs/experiment-lab/core/reproducibility.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const readJson = async (...parts) => JSON.parse(await readFile(join(here, ...parts), "utf8"));
const byteHash = async (...parts) => `sha256:${createHash("sha256").update(await readFile(join(here, ...parts))).digest("hex")}`;

test("frozen contender payload is unchanged", async () => {
  const document = await readJson("contenders", "frozen.json");
  const payload = structuredClone(document); delete payload.freeze;
  const computed = `sha256:${createHash("sha256").update(canonicalStringify(payload)).digest("hex")}`;
  assert.equal(computed, document.freeze.contentHash);
  assert.equal(payload.contenders.length, 3);
});

test("blind reports contain eight worlds and no contender identities", async () => {
  const blind = await readJson("runs", "public", "blind-summary.json");
  const contenders = await readJson("contenders", "frozen.json");
  assert.equal(blind.worlds.length, 8);
  const serialized = JSON.stringify(blind);
  for (const contender of contenders.contenders) assert.equal(serialized.includes(contender.id), false);
  assert.equal(blind.worlds.every((world) => world.runs.length === 3), true);
});

test("registry contains the two canonical stress regimes", async () => {
  const registry = await readJson("submissions", "registry.json");
  const admitted = registry.entries.filter((item) => item.status === "admitted");
  const tags = new Set(admitted.flatMap((item) => item.stress_tags ?? []));
  assert.equal(admitted.length, 8);
  assert.equal(tags.has("reliable-information-rare-action"), true);
  assert.equal(tags.has("degraded-information-available-action"), true);
});

test("corrected verdict removes invalid cross-world prediction aggregation", async () => {
  const corrected = await readJson("runs", "public", "blind-verdict-corrected-v2.json");
  assert.match(corrected.correctionReason, /incompatible scenario scales/);
  assert.equal(JSON.stringify(corrected).includes("meanOfWorldMeanPredictionAbsoluteErrors"), false);
  assert.equal(corrected.conclusion, "no_blind_method_avoids_non_compensable_breaches_across_all_worlds");
});

test("identity map opens only in the revealed summary", async () => {
  const blind = await readJson("runs", "public", "blind-summary.json");
  const revealed = await readJson("runs", "revealed-summary.json");
  assert.equal(blind.identityStatus, "sealed");
  assert.equal(revealed.identityStatus, "revealed_after_vector_verdict");
  assert.equal(Object.keys(revealed.identityMap).length, 3);
});

test("execution manifest byte hashes match archived artifacts", async () => {
  const manifest = await readJson("runs", "execution-manifest.json");
  for (const [path, expected] of Object.entries(manifest.artifact_byte_hashes)) {
    assert.equal(await byteHash(...path.split("/")), expected, path);
  }
});

test("every public run preserves matched baselines and vector-only outcomes", async () => {
  const registry = await readJson("submissions", "registry.json");
  for (const entry of registry.entries.filter((item) => item.status === "admitted")) {
    const report = await readJson("runs", "public", `${entry.scenario_id}.report.json`);
    assert.equal(report.runs.every((run) => JSON.stringify(run.baseline) === JSON.stringify(report.matchedBaseline)), true);
    assert.equal(report.runs.every((run) => !("winner" in run.outcomes) && !("aggregateScore" in run.outcomes)), true);
  }
});
