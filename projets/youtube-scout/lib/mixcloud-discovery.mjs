// Isolated public metadata adapter. Not registered with production discovery.
const ORIGIN = 'https://api.mixcloud.com';
const keyPattern = /^\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/$/;
const userPattern = /^\/[A-Za-z0-9_-]+\/$/;
const tagPattern = /^\/genres\/[A-Za-z0-9_:+-]+\/$/;
const id = (type, key) => `mixcloud:${type}:${key}`;
const url = key => `https://www.mixcloud.com${key}`;

export function mixcloudShowGraph(shows, sourceUrl) {
  const entities = new Map(), edges = new Map();
  for (const show of shows) {
    if (!show || typeof show.key !== 'string' || !keyPattern.test(show.key) || show.key.startsWith('/genres/')) continue;
    const sid = id('show', show.key);
    entities.set(sid, { id: sid, type: 'show', source: 'mixcloud', name: String(show.name || '').slice(0, 500), sourceUrl: url(show.key) });
    const connect = (kind, type, item, pattern) => {
      if (!item || typeof item.key !== 'string' || !pattern.test(item.key)) return;
      const tid = id(type, item.key);
      entities.set(tid, { id: tid, type, source: 'mixcloud', name: String(item.name || item.username || '').slice(0, 500), sourceUrl: url(item.key) });
      const edge = { from: sid, to: tid, kind, status: 'observed', source: 'mixcloud', sourceUrl,
        evidence: [{ source: 'mixcloud', sourceUrl, objectKey: show.key }] };
      edges.set(JSON.stringify([sid, kind, tid]), edge);
    };
    connect('uploaded_by', 'user', show.user, userPattern);
    for (const tag of (Array.isArray(show.tags) ? show.tags : []).slice(0, 50)) connect('tagged_with', 'tag', tag, tagPattern);
  }
  return { entities: [...entities.values()], edges: [...edges.values()] };
}

async function boundedJson(response, maxBytes, signal) {
  if (!response.body?.getReader) throw new Error('Mixcloud streaming body required');
  const reader = response.body.getReader();
  const cancel = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', cancel, { once: true });
  let complete = false;
  try {
    const declared = Number(response.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > maxBytes) throw new Error('Mixcloud body exceeds byte limit');
    const chunks = []; let size = 0;
    while (true) {
      if (signal.aborted) throw new Error('Mixcloud aborted');
      const { done, value } = await reader.read();
      if (signal.aborted) throw new Error('Mixcloud aborted');
      if (done) break;
      if (!(value instanceof Uint8Array)) throw new Error('Mixcloud byte stream required');
      size += value.byteLength;
      if (size > maxBytes) throw new Error('Mixcloud body exceeds byte limit');
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    complete = true;
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } finally {
    signal.removeEventListener('abort', cancel);
    if (!complete) cancel();
    reader.releaseLock();
  }
}

export async function readMixcloudShows({ username, fetch: fetchImpl, maxPages = 2, pageSize = 20, timeoutMs = 5000, maxBytes = 1048576, signal } = {}) {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(username || '') || username === 'me') throw new TypeError('Public username required');
  if (typeof fetchImpl !== 'function') throw new TypeError('Explicit fetch required');
  for (const [value, max] of [[maxPages, 5], [pageSize, 100], [timeoutMs, 30000], [maxBytes, 4194304]]) if (!Number.isInteger(value) || value < 1 || value > max) throw new RangeError('Invalid request budget');
  const entities = new Map(), edges = new Map();
  let pages = 0, more = false;
  for (let page = 0; page < maxPages; page++) {
    if (signal?.aborted) throw signal.reason || new Error('Aborted');
    const controller = new AbortController();
    const abort = () => controller.abort(signal.reason);
    signal?.addEventListener('abort', abort, { once: true });
    const endpoint = `${ORIGIN}/${username}/cloudcasts/?limit=${pageSize}&offset=${page * pageSize}`;
    let timer;
    try {
      const deadline = new Promise((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error('Mixcloud timeout')); }, timeoutMs);
        controller.signal.addEventListener('abort', () => reject(new Error('Mixcloud aborted')), { once: true });
      });
      const data = await Promise.race([deadline, (async () => {
        const response = await fetchImpl(endpoint, { method: 'GET', redirect: 'error', credentials: 'omit', headers: { Accept: 'application/json' }, signal: controller.signal });
        if (!response.ok) throw new Error(`Mixcloud HTTP ${response.status}`);
        if (!(response.headers.get('content-type') || '').includes('application/json')) throw new Error('Mixcloud JSON required');
        const body = await boundedJson(response, maxBytes, controller.signal);
        if (!Array.isArray(body?.data)) throw new Error('Mixcloud list required');
        return body;
      })()]);
      const graph = mixcloudShowGraph(data.data.slice(0, pageSize), endpoint);
      for (const node of graph.entities) entities.set(node.id, node);
      for (const edge of graph.edges) edges.set(JSON.stringify([edge.from, edge.kind, edge.to]), edge);
      pages++;
      more = Boolean(data.paging?.next);
      if (!more) break; // Never follow server-provided URLs or send credentials.
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
  }
  return { source: 'mixcloud', entities: [...entities.values()], edges: [...edges.values()], coverage: { pages, partial: more }, activated: false };
}
