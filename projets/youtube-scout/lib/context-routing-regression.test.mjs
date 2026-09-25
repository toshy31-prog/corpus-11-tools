import test from "node:test";
import assert from "node:assert/strict";
import { catalogueCandidates, discogsReleaseGraph } from "./catalogue.mjs";
import { createExplorationSession } from "./exploration.mjs";

function fixture() {
  const seedId = "video:youtube:fixtureAnt1";
  const graph = { entities: {}, edges: {} };
  const add = delta => {
    for (const node of delta.entities) graph.entities[node.id] = node;
    for (const edge of delta.edges) graph.edges[`${edge.from}:${edge.kind}:${edge.to}`] = edge;
  };
  const release = (id, name, label, year = 2023) => discogsReleaseGraph({ id, title: `Release ${id}`, year, artists: [{ id, name }], labels: [{ id: label, name: `Label ${label}` }], tracklist: [{ title: `Track ${id}`, position: "A1" }] });
  add(release(1, "Kindaaz", 77));
  add(release(2, "Linked artist", 77));
  add(release(3, "Older linked artist", 77, 2009));
  add({ entities: [{ id: seedId, type: "video", title: "Ant People" }], edges: [{ from: seedId, to: "artist:discogs:1", kind: "probable_artist", status: "confirmed_user" }] });
  return { graph, seedId, add, release };
}

test("same decade cannot leak unrelated remembered artists into Ant People's mix", () => {
  const { graph, seedId, add, release } = fixture();
  const before = catalogueCandidates(graph, seedId, "era");
  assert.equal(before.length, 1);
  assert.equal(before[0].artist, "Linked artist");
  for (let id = 10; id < 110; id++) add(release(id, id % 2 ? "808NOCHE" : "KAS:ST", id + 1000));
  const stored = JSON.stringify(graph);
  assert.deepEqual(catalogueCandidates(graph, seedId, "era"), before);
  assert.equal(JSON.stringify(graph), stored, "The graph is preserved, not purged");
  assert.ok(catalogueCandidates(graph, "artist:discogs:10", "label"), "Other artists remain usable as explicit starts");
});

test("era keeps tracklists and exposes both the structural path and separate date evidence", () => {
  const { graph, seedId } = fixture();
  const [item] = catalogueCandidates(graph, seedId, "era");
  assert.equal(item.type, "track");
  assert.equal(item.relatedVia, "label");
  assert.equal(item.periodContext.label, "2020s");
  assert.ok(item.path.some(step => step.relation === "issued_by"));
  assert.equal(item.path.some(step => step.relation === "released_in_era"), false);
  assert.ok(item.periodContext.sourcePath.some(step => step.relation === "released_in_era"));
  assert.ok(item.periodContext.targetPath.some(step => step.relation === "released_in_era"));
  assert.ok(item.path.every((step, index) => !index || item.path[index - 1].to.id === step.from.id));
});

test("weak artist identity and date-only graphs cannot become period recommendations", () => {
  const { graph, seedId } = fixture();
  for (const edge of Object.values(graph.edges)) if (edge.kind === "probable_artist") edge.status = "local_hypothesis";
  assert.deepEqual(catalogueCandidates(graph, seedId, "era"), []);
  const edges = Object.values(graph.edges).filter(edge => edge.kind !== "issued_by");
  assert.deepEqual(catalogueCandidates({ entities: graph.entities, edges }, "artist:discogs:1", "era"), []);
});

test("resuming an old era branch revalidates the target, not the saved decade shortcut", () => {
  const { graph, seedId, add, release } = fixture();
  add(release(10, "808NOCHE", 900));
  const previous = { seed: { id: seedId, type: "track" }, branches: [{ direction: "era", status: "active", current: { signature: "obsolete-decade", target: { id: "track:discogs:10:A1" } } }] };
  const front = createExplorationSession({ state: graph, seed: previous.seed, directions: ["era"], depth: 9, previous });
  assert.notEqual(front.branches[0].current?.target.id, "track:discogs:10:A1");
});
