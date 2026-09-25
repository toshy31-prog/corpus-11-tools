import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

// Offline, read-only, same protocol for every version. No provider calls.
const [storePath, seedId, ...roots] = process.argv.slice(2);
if (!storePath || !seedId || !roots.length) throw new Error("Usage: STORE SEED ROOT [ROOT...]");
const raw = await readFile(storePath, "utf8"), { cache, ...graph } = JSON.parse(raw);
assert.ok(graph.entities[seedId]);
const load = (root, file) => import(pathToFileURL(resolve(root, file)));
const time = run => {
  run(); const samples = [];
  for (let i = 0; i < 9; i++) { const start = performance.now(); run(); samples.push(performance.now() - start); }
  return +samples.sort((a, b) => a - b)[4].toFixed(2);
};
const results = [];
for (const root of roots) {
  const { version } = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
  const { catalogueCandidates, CATALOGUE_DIRECTIONS } = await load(root, "lib/catalogue-graph.mjs");
  let snapshot = value => value;
  try { const module = await load(root, "public/departure-integrity.mjs"); snapshot = module.departureRoutingSnapshot || snapshot; }
  catch (error) { if (error.code !== "ERR_MODULE_NOT_FOUND") throw error; }
  const collect = state => Object.fromEntries(CATALOGUE_DIRECTIONS.map(direction => [direction, catalogueCandidates(state, seedId, direction).map(item => item.id).sort()]));
  const state = snapshot(graph);
  results.push({ version, newSnapshotAndDirectionsMs: time(() => collect(snapshot(graph))), repeatedDirectionsMs: time(() => collect(state)), candidates: collect(state) });
}
assert.equal(await readFile(storePath, "utf8"), raw, "Personal store unchanged");
if (results.length > 1 && results.at(-2).version === "0.18.0") assert.deepEqual(results.at(-1).candidates, results.at(-2).candidates);
console.log(JSON.stringify({ offline: true, graphHash: createHash("sha256").update(raw).digest("hex"), samples: 9,
  results: results.map(({ candidates, ...row }) => ({ ...row, counts: Object.fromEntries(Object.entries(candidates).map(([key, values]) => [key, values.length])) })) }, null, 2));
