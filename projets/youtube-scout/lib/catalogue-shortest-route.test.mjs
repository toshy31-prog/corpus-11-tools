import test from "node:test";
import assert from "node:assert/strict";
import { catalogueCandidates } from "./catalogue-graph.mjs";

function fixture({ broad = false, identityStatus = "confirmed_cross_id" } = {}) {
  const entities = [["A", "artist"], ["B", "artist"], ["T", "track"], ["R", "release"],
    ["L1", "label"], ["L2", "label"], ["S", "release"], ["X", "track"]].map(([id, type]) =>
    ({ id, type, name: id, title: id, ...(id === "L2" && broad ? { catalogueSize: 800 } : {}) }));
  const edge = (from, kind, to, status = "observed") => ({ from, kind, to, status, source: "synthetic" });
  return { entities, edges: [edge("A", "credited_on", "T"), edge("T", "appears_on", "R"),
    edge("R", "issued_by", "L1"), edge("A", "same_identity", "B", identityStatus),
    edge("B", "associated_label", "L2"), edge("S", "issued_by", "L1"),
    edge("S", "issued_by", "L2"), edge("X", "appears_on", "S")] };
}

test("SYNTHETIC: shorter same-scope documented path wins even when its anchor arrives later", () => {
  const graph = fixture(), before = structuredClone(graph);
  for (const edges of [graph.edges, [...graph.edges].reverse()]) {
    const items = catalogueCandidates({ ...graph, edges }, "A", "label");
    assert.deepEqual(items.map(item => item.id), ["X"]);
    assert.equal(items[0].path.length, 4);
    assert.equal(items[0].anchor.id, "L2");
    assert.deepEqual(items[0].path.map(step => step.relation), ["same_identity", "associated_label", "issued_by", "appears_on"]);
    assert.equal(items[0].path[0].status, "confirmed_cross_id");
    assert.equal(items[0].evidence.length, 4);
  }
  assert.deepEqual(graph, before);
});

test("SYNTHETIC: fewer hops cannot replace ordinary label scope with a broad catalogue", () => {
  const [item] = catalogueCandidates(fixture({ broad: true }), "A", "label");
  assert.equal(item.path.length, 5);
  assert.equal(item.anchor.id, "L1");
  assert.equal(item.relationship.distant, false);
});

test("SYNTHETIC: unsafe identity shortcut remains excluded rather than shortened", () => {
  for (const identityStatus of ["candidate", "inferred", "rejected_user"]) {
    const [item] = catalogueCandidates(fixture({ identityStatus }), "A", "label");
    assert.equal(item.path.length, 5);
    assert.equal(item.anchor.id, "L1");
    assert.ok(item.path.every(step => step.relation !== "same_identity"));
  }
});
