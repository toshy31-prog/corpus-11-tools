import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareBlindEvaluation, evaluateBlindJudgments } from '../scripts/blinded-discovery-evaluation.mjs';

const input = () => ({ salt: 'fixture-not-private', queries: [{ id: 'departure', departureTitle: 'Departure',
  items: [{ id: 'a', title: 'A', artists: ['One'], score: 0.99 }, { id: 'b', title: 'B', artists: ['Two'] }],
  rankings: [{ method: 'scout', ids: ['a', 'b'] }, { method: 'baseline', ids: ['b', 'a'] }] }] });
const rowsFor = key => key.queries.flatMap(q => q.items.map(i => ({ queryToken: q.token, itemToken: i.token, grade: i.id === 'a' ? 3 : 0 })));

test('judge packet hides method, score, original IDs and rank; deterministic under input permutations', () => {
  const { packet } = prepareBlindEvaluation(input());
  const alternate = input(); alternate.queries[0].items.reverse(); alternate.queries[0].rankings.reverse();
  assert.deepEqual(prepareBlindEvaluation(alternate).packet, packet);
  assert.deepEqual(Object.keys(packet.queries[0].items[0]).sort(), ['artists', 'grade', 'title', 'token']);
  assert.ok(!JSON.stringify(packet).includes('scout'));
  assert.ok(!JSON.stringify(packet).includes('score'));
});

test('complete grades compare on exactly the same frozen catalogue', () => {
  const { key } = prepareBlindEvaluation(input());
  const result = evaluateBlindJudgments({ key, rows: rowsFor(key), k: 1 });
  assert.equal(result.results[0].methods[0].ndcgAtK, 1);
  assert.equal(result.results[0].methods[1].ndcgAtK, 0);
});

test('missing or null grade remains unknown, not negative', () => {
  const { key } = prepareBlindEvaluation(input());
  for (const rows of [[], rowsFor(key).slice(0, 1), rowsFor(key).map(r => ({ ...r, grade: null }))]) {
    assert.ok(evaluateBlindJudgments({ key, rows }).results[0].methods.every(m => m.ndcgAtK === null && m.recallAtK === null));
  }
});

test('duplicate, foreign and invalid judgment rows fail explicitly', () => {
  const { key } = prepareBlindEvaluation(input()); const rows = rowsFor(key);
  assert.throws(() => evaluateBlindJudgments({ key, rows: [...rows, rows[0]] }), /duplicate/);
  assert.throws(() => evaluateBlindJudgments({ key, rows: [{ ...rows[0], itemToken: 'foreign' }] }), /unknown/);
  for (const grade of [-1, 4, NaN, 1.5, undefined]) assert.throws(() => evaluateBlindJudgments({ key, rows: [{ ...rows[0], grade }] }), /grade/);
});

test('duplicate items, out-of-pool rankings and unequal methods cannot enter a comparison', () => {
  const duplicate = input(); duplicate.queries[0].items.push(duplicate.queries[0].items[0]);
  assert.throws(() => prepareBlindEvaluation(duplicate), /duplicate/);
  const foreign = input(); foreign.queries[0].rankings[0].ids.push('foreign');
  assert.throws(() => prepareBlindEvaluation(foreign), /outside/);
  const mismatch = input(); mismatch.queries.push({ ...input().queries[0], id: 'other', rankings: [{ method: 'different', ids: [] }, { method: 'baseline', ids: [] }] });
  assert.throws(() => prepareBlindEvaluation(mismatch), /same methods/);
});

test('imported coordinator key cannot reuse a token to multiply one judgment', () => {
  const { key } = prepareBlindEvaluation(input());
  key.queries[0].items[1].token = key.queries[0].items[0].token;
  assert.throws(() => evaluateBlindJudgments({ key, rows: rowsFor(key).slice(0, 1) }), /key item/);
  const invalid = prepareBlindEvaluation(input()).key;
  invalid.queries[0].rankings[1].method = 'scout';
  assert.throws(() => evaluateBlindJudgments({ key: invalid, rows: [] }), /key method/);
});
