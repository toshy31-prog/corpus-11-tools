// Explicit public-metadata experiment; never reads Scout's library or credentials.
import { readMixcloudShows } from '../lib/mixcloud-discovery.mjs';

const [consent, username] = process.argv.slice(2);
if (consent !== '--public-network' || !username) {
  console.error('Usage: node scripts/probe-mixcloud.mjs --public-network PUBLIC_USERNAME');
  process.exitCode = 2;
} else {
  const started = Date.now();
  try {
    const graph = await readMixcloudShows({ username, fetch: globalThis.fetch,
      maxPages: 1, pageSize: 5, timeoutMs: 5000 });
    const types = Object.create(null);
    for (const entity of graph.entities) types[entity.type] = (types[entity.type] || 0) + 1;
    console.log(JSON.stringify({ observedAt: new Date().toISOString(),
      source: graph.source, publicUsername: username, elapsedMs: Date.now() - started,
      entitiesByType: types, edges: graph.edges.length, coverage: graph.coverage,
      activated: false, musicalRelevanceEvaluated: false }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ source: 'mixcloud', observedAt: new Date().toISOString(),
      elapsedMs: Date.now() - started, error: error.message, activated: false }));
    process.exitCode = 1;
  }
}
