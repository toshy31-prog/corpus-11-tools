// Offline preparation only. Judge packet and coordinator key must be distributed separately.
// Hiding method/rank reduces presentation cues; it is not cryptographic anonymity.
import { createHash } from 'node:crypto';
import { evaluateRanking } from './offline-ranking-metrics.mjs';

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const id = value => typeof value === 'string' && value.trim().length > 0;
const distinct = values => values.every(id) && new Set(values).size === values.length;

export function prepareBlindEvaluation({ queries, salt }) {
  if (!id(salt) || !Array.isArray(queries) || !queries.length) throw new TypeError('queries and explicit salt required');
  if (!distinct(queries.map(q => q?.id))) throw new TypeError('query IDs must be unique');
  let methods;
  const key = { schemaVersion: 1, scope: 'offline_frozen_catalogue_only', queries: [] };
  const packet = { schemaVersion: 1, instructions: 'Grade 0–3, or null for unjudged. Musical interest only; documentary validity is separate.', queries: [] };
  for (const q of queries) {
    if (!id(q.departureTitle) || !Array.isArray(q.items) || !q.items.length || !Array.isArray(q.rankings) || q.rankings.length < 2) {
      throw new TypeError('each query needs a departure, frozen items and at least two rankings');
    }
    const eligibleIds = q.items.map(item => item?.id);
    if (!distinct(eligibleIds) || !distinct(q.rankings.map(r => r?.method))) throw new TypeError('duplicate item or method');
    const names = q.rankings.map(r => r.method).sort();
    if (methods && JSON.stringify(methods) !== JSON.stringify(names)) throw new TypeError('same methods required for every query');
    methods = names;
    for (const r of q.rankings) evaluateRanking({ rankedIds: r.ids, eligibleIds, judgments: {} });
    const queryToken = digest([salt, 'query', q.id]);
    const items = q.items.map(item => {
      if (!id(item.title) || !Array.isArray(item.artists) || !item.artists.every(id)) throw new TypeError('title and artist strings required');
      return { token: digest([salt, 'item', q.id, item.id]), id: item.id, title: item.title, artists: [...item.artists] };
    });
    // Sorting opaque tokens avoids both input order and ranking position in the judge packet.
    packet.queries.push({ token: queryToken, departureTitle: q.departureTitle,
      items: items.map(({ token, title, artists }) => ({ token, title, artists, grade: null })).sort((a, b) => a.token.localeCompare(b.token)) });
    key.queries.push({ id: q.id, token: queryToken, items, rankings: q.rankings.map(r => ({ method: r.method, ids: [...r.ids] })) });
  }
  packet.queries.sort((a, b) => a.token.localeCompare(b.token));
  key.packetHash = digest(packet);
  return { packet, key };
}

// Rows avoid JSON object keys silently overwriting repeated judgments.
// One call is one judge: disagreements between people must remain separate.
export function evaluateBlindJudgments({ key, rows, k = 10 }) {
  if (key?.schemaVersion !== 1 || !Array.isArray(key.queries) || !key.queries.length || !Array.isArray(rows)) throw new TypeError('invalid key or judgment rows');
  if (!distinct(key.queries.map(q => q?.id)) || !distinct(key.queries.map(q => q?.token))) throw new TypeError('duplicate or invalid key query');
  let methods;
  for (const q of key.queries) {
    if (!Array.isArray(q.items) || !q.items.length || !Array.isArray(q.rankings) || q.rankings.length < 2) throw new TypeError('invalid key catalogue or rankings');
    if (!distinct(q.items.map(i => i?.id)) || !distinct(q.items.map(i => i?.token))) throw new TypeError('duplicate or invalid key item');
    if (!distinct(q.rankings.map(r => r?.method))) throw new TypeError('duplicate or invalid key method');
    const names = q.rankings.map(r => r.method).sort();
    if (methods && JSON.stringify(methods) !== JSON.stringify(names)) throw new TypeError('same methods required for every query');
    methods = names;
    for (const r of q.rankings) evaluateRanking({ rankedIds: r.ids, eligibleIds: q.items.map(i => i.id), judgments: {}, k });
  }
  const queries = new Map(key.queries.map(q => [q.token, q]));
  const labels = new Map();
  for (const row of rows) {
    const query = queries.get(row?.queryToken);
    if (!query || !query.items.some(item => item.token === row.itemToken)) throw new RangeError('unknown judgment token');
    if (row.grade !== null && (!Number.isInteger(row.grade) || row.grade < 0 || row.grade > 3)) throw new RangeError('grade must be null or integer 0–3');
    const token = JSON.stringify([row.queryToken, row.itemToken]);
    if (labels.has(token)) throw new TypeError('duplicate judgment row');
    labels.set(token, row.grade);
  }
  const results = key.queries.map(q => {
    const judgments = Object.create(null);
    for (const item of q.items) {
      const grade = labels.get(JSON.stringify([q.token, item.token]));
      if (grade !== undefined && grade !== null) judgments[item.id] = grade;
    }
    const eligibleIds = q.items.map(item => item.id);
    const artistsById = Object.fromEntries(q.items.map(item => [item.id, item.artists]));
    return { queryId: q.id, methods: q.rankings.map(r => ({ method: r.method,
      ...evaluateRanking({ rankedIds: r.ids, eligibleIds, judgments, k, artistsById }) })) };
  });
  return { schemaVersion: 1, scope: 'single_judge_offline_only', packetHash: key.packetHash, results };
}
