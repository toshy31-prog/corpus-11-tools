import test from "node:test";
import assert from "node:assert/strict";
import { catalogueCandidates, CATALOGUE_DIRECTIONS } from "./catalogue-graph.mjs";

const entities = [{ id: "A", type: "artist", name: "A" }, { id: "B", type: "artist", name: "B" },
  { id: "T", type: "track", title: "T" }, { id: "U", type: "track", title: "U" }];
const edge = (from, kind, to) => ({ from, kind, to, status: "observed", source: "synthetic" });
const edges = [edge("A", "credited_on", "T"), edge("B", "credited_on", "T"),
  edge("T", "remixed_by", "B"), edge("B", "credited_on", "U")];
const permutations = values => values.length ? values.flatMap((v, i) => permutations(values.filter((_, j) => j !== i)).map(tail => [v, ...tail])) : [[]];

test("SYNTHETIC: 24 edge permutations preserve documented remix and seven negative routes", () => {
  for (const order of permutations(edges)) {
    const graph = { entities: structuredClone(entities), edges: structuredClone(order) }, before = structuredClone(graph);
    for (const direction of CATALOGUE_DIRECTIONS) {
      const candidates = catalogueCandidates(graph, "A", direction);
      assert.deepEqual(candidates.map(c => c.id), direction === "remix" ? ["U"] : []);
      if (direction === "remix") {
        assert.deepEqual(candidates[0].path.map(p => p.relation), ["credited_on", "remixed_by", "credited_on"]);
        assert.equal(candidates[0].path[1].edgeFrom, "T");
        assert.equal(candidates[0].path[1].edgeTo, "B");
        assert.ok(candidates[0].path.every(p => p.status === "observed"));
      }
    }
    assert.deepEqual(graph, before);
  }
});

test("SYNTHETIC: absent or unsafe motif cannot become a remix through ordinary credits", () => {
  for (const status of [null, "candidate", "unresolved", "inferred", "rejected_user"]) {
    const graph = { entities, edges: edges.flatMap(e => e.kind !== "remixed_by" ? [e] : status ? [{ ...e, status }] : []) };
    assert.deepEqual(catalogueCandidates(graph, "A", "remix"), []);
  }
});

test("SYNTHETIC: 120 permutations preserve collaboration motif despite equal-length ordinary credits", () => {
  const nodes = [...entities, { id: "C", type: "artist", name: "C" }];
  const links = [edge("A", "credited_on", "T"), edge("C", "credited_on", "T"),
    edge("A", "featured_with", "B"), edge("B", "featured_with", "C"), edge("C", "credited_on", "U")];
  for (const order of permutations(links)) {
    const candidates = catalogueCandidates({ entities: nodes, edges: order }, "A", "featuring");
    assert.deepEqual(candidates.map(c => c.id).sort(), ["T", "U"]);
    for (const item of candidates) {
      assert.ok(item.path.some(p => p.relation === "featured_with"));
      assert.equal(item.path.length, 3);
    }
  }
  const unsafe = links.map(e => e.kind === "featured_with" ? { ...e, status: "inferred" } : e);
  assert.deepEqual(catalogueCandidates({ entities: nodes, edges: unsafe }, "A", "featuring"), []);
});

test("SYNTHETIC: production role stays explicitly production, and cycles do not inflate paths", () => {
  const graph = { entities, edges: edges.map(e => e.kind === "remixed_by" ? { ...e, kind: "produced_by" } : e) };
  graph.edges.push(edge("B", "credited_on", "T"));
  const candidates = catalogueCandidates(graph, "A", "remix");
  assert.deepEqual(candidates.map(c => c.id), ["U"]);
  assert.equal(candidates[0].path.length, 3);
  assert.match(candidates[0].explanation, /producteur/);
  assert.doesNotMatch(candidates[0].explanation, /remixeur/);
});

test("SYNTHETIC: return-to-seed motif and motif beyond two local hops do not create anchors", () => {
  const selfRemix = { entities, edges: [edge("A", "credited_on", "T"), edge("T", "remixed_by", "A"), edge("A", "credited_on", "U")] };
  assert.deepEqual(catalogueCandidates(selfRemix, "A", "remix"), []);
  const distant = { entities: [...entities, { id: "C", type: "artist", name: "C" }, { id: "V", type: "track", title: "V" }],
    edges: [edge("A", "credited_on", "T"), edge("B", "credited_on", "T"), edge("B", "credited_on", "U"),
      edge("U", "remixed_by", "C"), edge("C", "credited_on", "V")] };
  assert.deepEqual(catalogueCandidates(distant, "A", "remix"), []);
});
