import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

// Offline, read-only comparison. No server, provider request or store.persist.
// Usage: node scripts/performance-regression-audit.mjs STORE PRE016 PREPATCH SEED
const [storePath, historicalPath, previousPath, seedId] = process.argv.slice(2);
if (!seedId) throw new Error("Arguments: STORE PRE016 PREPATCH SEED");
const raw = await readFile(storePath, "utf8"), state = JSON.parse(raw);
const { cache, ...graph } = state;
assert.ok(graph.entities[seedId], "seed exists in the observed graph");
const load = (root, file) => import(pathToFileURL(resolve(root, file)).href);
const median = values => [...values].sort((a,b) => a-b)[Math.floor(values.length / 2)];
function timing(run, count = 9) {
  run();
  const samples = [];
  for (let i = 0; i < count; i++) { const start = performance.now(); run(); samples.push(performance.now() - start); }
  return { medianMs: +median(samples).toFixed(2), minMs: +Math.min(...samples).toFixed(2), maxMs: +Math.max(...samples).toFixed(2), samples: count };
}
const output = { offline: true, graphHash: createHash("sha256").update(raw).digest("hex"),
  entities: Object.keys(graph.entities).length, edges: Object.keys(graph.edges).length,
  cacheBytes: Buffer.byteLength(JSON.stringify(cache)), versions: [] };
let previousResult;
for (const [label, root] of [["pre016_available", historicalPath], ["before_patch", previousPath], ["patched", process.cwd()]]) {
  const { version } = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
  const { PersistentStore } = await load(root, "lib/persistent-store.mjs");
  const { catalogueCandidates, CATALOGUE_DIRECTIONS } = await load(root, "lib/catalogue-graph.mjs");
  const { journeyGuidance } = await load(root, "public/journey-state.mjs");
  const store = new PersistentStore("not-written"); store.state = state;
  const item = { label, version, snapshot: timing(() => store.snapshot()) };
  let readGraph = graph;
  if (label === "patched") {
    const { departureRoutingSnapshot } = await load(root, "public/departure-integrity.mjs");
    item.newReadSnapshot = timing(() => departureRoutingSnapshot(graph));
    item.newSnapshotAndEightDirections = timing(() => {
      const snapshot = departureRoutingSnapshot(graph);
      for (const direction of CATALOGUE_DIRECTIONS) catalogueCandidates(snapshot, seedId, direction);
    });
    readGraph = departureRoutingSnapshot(graph);
  }
  const collect = () => Object.fromEntries(CATALOGUE_DIRECTIONS.map(direction => [direction, catalogueCandidates(readGraph, seedId, direction).map(v => v.id).sort()]));
  item.eightDirections = timing(collect);
  item.guidance = timing(() => journeyGuidance({ seed: graph.entities[seedId], graph: readGraph }));
  const result = collect();
  item.candidateCounts = Object.fromEntries(Object.entries(result).map(([key, values]) => [key, values.length]));
  if (label !== "pre016_available") {
    const { discogsReleaseGraph, exploreCatalogueBranch, createCatalogueEligibility } = await load(root, "lib/catalogue.mjs");
    const release = (id, ids, tracks) => ({ id, title: `Fixture ${id}`, artists: ids.map(id => ({ id, name: `Artist ${id}` })),
      tracklist: Array.from({ length: tracks }, (_, i) => ({ title: `Track ${i}`, position: String(i + 1), type_: "track" })) });
    const delta = discogsReleaseGraph(release(100, [10, 20], 15));
    const fixture = { entities: Object.fromEntries(delta.entities.map(e => [e.id, e])), edges: Object.fromEntries(delta.edges.map((e,i) => [String(i), e])) };
    const warm = new Map([["/artists/20", { id: 20, name: "Artist 20" }], ["/artists/20/releases", { releases: [{ id: 100 }, { id: 200 }], pagination: { pages: 1 } }], ["/releases/100", release(100, [10, 20], 15)]]);
    let misses = 0;
    const branch = await exploreCatalogueBranch({ graph: fixture, seedId: "artist:discogs:10", direction: "featuring", configured: { discogs: true }, requestBudget: 1,
      candidateEligible: createCatalogueEligibility({ graph: fixture, seedId: "artist:discogs:10", seedArtist: "Artist 10", otherArtistsOnly: true }), minimumEligible: 6,
      readCached: (_source, path) => warm.get(path), request: async (_source, path) => {
        if (warm.has(path)) return warm.get(path);
        assert.equal(path, "/releases/200"); misses++; return release(200, [20], 6);
      } });
    item.syntheticWarmBranch = { simulatedNonCachedReads: misses, eligibleTracks: branch.coverage.selection.returnedEligible, stopReason: branch.coverage.selection.stopReason };
  }
  if (label === "before_patch") previousResult = result;
  if (label === "patched") { assert.deepEqual(result, previousResult, "performance changes retain the same candidate set under the existing identity policy"); item.sameCandidatesAsBeforePatch = true; }
  output.versions.push(item);
}
assert.equal(await readFile(storePath, "utf8"), raw, "personal store untouched during the audit");
console.log(JSON.stringify(output, null, 2));
