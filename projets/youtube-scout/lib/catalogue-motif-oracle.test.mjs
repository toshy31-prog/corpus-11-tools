import test from 'node:test';
import assert from 'node:assert/strict';
import { graphIndex, directionAnchors } from './catalogue-graph.mjs';

// Independent exhaustive oracle for a small artist-start graph: enumerate all
// walks of length <= 2, then test the route motif. No production visited-state
// implementation is reused. This checks reachability, not every explanation.
function oracle(entities, edges, direction) {
  const motif = direction === 'remix' ? new Set(['remixed_by', 'produced_by']) : new Set(['featured_with']);
  const allowed = new Set(['credited_on', 'primary_artist', 'credited_on_release', ...motif]);
  const found = new Set();
  const visit = (from, path) => {
    if (from !== 'a' && entities[from].type === 'artist' && path.some(e => motif.has(e.kind))) found.add(from);
    if (path.length === 2) return;
    for (const edge of edges) {
      if (edge.status !== 'observed' || !allowed.has(edge.kind)) continue;
      const to = edge.from === from ? edge.to : edge.to === from ? edge.from : null;
      if (to) visit(to, [...path, edge]);
    }
  };
  visit('a', []);
  return [...found].sort();
}

test('route anchors match exhaustive bounded oracle across 256 graphs and reversed edges', () => {
  const entities = Object.fromEntries(['a', 'b', 'c', 't', 'u'].map(id => [id, { id, type: ['t', 'u'].includes(id) ? 'track' : 'artist', name: id }]));
  const tuples = [
    ['a', 't', 'credited_on'], ['b', 't', 'credited_on'],
    ['t', 'b', 'remixed_by'], ['t', 'c', 'produced_by'],
    ['a', 'b', 'featured_with'], ['b', 'u', 'credited_on'],
    ['a', 'u', 'credited_on'], ['u', 'c', 'remixed_by']
  ];
  for (let mask = 0; mask < 2 ** tuples.length; mask++) {
    const edges = tuples.filter((_, i) => mask & (1 << i)).map(([from, to, kind], i) => ({ id: `e${i}`, from, to, kind, status: 'observed', source: 'fixture' }));
    for (const direction of ['remix', 'featuring']) {
      const expected = oracle(entities, edges, direction);
      for (const order of [edges, [...edges].reverse()]) {
        const actual = [...directionAnchors(graphIndex({ entities, edges: order }), 'a', direction).anchors.keys()].sort();
        assert.deepEqual(actual, expected, `mask=${mask}, direction=${direction}`);
      }
    }
  }
});
