function retryAfterMilliseconds(response) {
  const raw = response.headers.get("retry-after");
  if (!raw) return 0;
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(raw);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : 0;
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export class SourceRuntime {
  constructor({ store, fetchImpl = fetch, now = () => Date.now(), sleep = wait, userAgent = "YouTubeScout/0.10.0 (local personal discovery tool)" } = {}) {
    this.store = store;
    this.fetchImpl = fetchImpl;
    this.now = now;
    this.sleep = sleep;
    this.userAgent = userAgent;
    this.sources = new Map();
  }

  register(name, options = {}) {
    this.sources.set(name, {
      minIntervalMs: Number(options.minIntervalMs || 0),
      retries: Number(options.retries ?? 2),
      timeoutMs: Number(options.timeoutMs || 12_000),
      configured: options.configured !== false,
      revision: 0,
      tail: Promise.resolve(),
      lastRequestAt: 0,
      state: { status: options.configured === false ? "not_configured" : "idle", successes: 0, failures: 0, lastError: "", lastRequestAt: null, lastSuccessAt: null }
    });
  }

  status() {
    return Object.fromEntries([...this.sources.entries()].map(([name, source]) => [name, { ...source.state }]));
  }

  cached(sourceName, url, cacheKey = url) {
    if (!this.sources.get(sourceName)?.configured) return null;
    const scopedKey = `v2:${JSON.stringify([String(url), String(cacheKey)])}`;
    const current = this.store?.cacheGet(sourceName, scopedKey);
    if (current) return current;
    const legacy = this.store?.cacheGet(sourceName, cacheKey);
    return legacy?.url === String(url) ? legacy : null;
  }

  setConfigured(name, configured) {
    const source = this.sources.get(name);
    if (!source) throw new Error(`Source inconnue: ${name}`);
    source.configured = configured;
    source.revision += 1;
    source.state = {
      ...source.state,
      status: configured ? (source.state.status === "not_configured" ? "idle" : source.state.status) : "not_configured",
      lastError: configured ? source.state.lastError : ""
    };
  }

  async request(sourceName, url, { cacheKey = url, ttlMs = 24 * 60 * 60 * 1000, staleMs = 30 * 24 * 60 * 60 * 1000, headers = {}, parse = (response) => response.json() } = {}) {
    const source = this.sources.get(sourceName);
    if (!source) throw new Error(`Source inconnue: ${sourceName}`);
    const revision = source.revision;
    const assertActive = () => {
      this.store?.assertActive?.();
      if (!source.configured || source.revision !== revision) throw new Error(`${sourceName} : configuration changée, requête interrompue.`);
    };
    assertActive();
    // Logical keys alone may collide across queries or provider environments.
    // Old entries remain on disk; only ones with the exact URL can be reused.
    const scopedKey = `v2:${JSON.stringify([String(url), String(cacheKey)])}`;
    const readCache = options => {
      const current = this.store?.cacheGet(sourceName, scopedKey, options);
      if (current) return current;
      const legacy = this.store?.cacheGet(sourceName, cacheKey, options);
      return legacy?.url === String(url) ? legacy : null;
    };
    const cached = readCache();
    if (cached) return { data: cached.value, provenance: { source: sourceName, cache: "fresh", observedAt: new Date(cached.savedAt).toISOString() } };

    const execute = async () => {
      assertActive();
      // A preceding queued request may have filled this cache while we waited.
      const queuedCache = readCache();
      if (queuedCache) return { data: queuedCache.value, provenance: { source: sourceName, cache: "fresh", observedAt: new Date(queuedCache.savedAt).toISOString() } };
      let lastError;
      for (let attempt = 0; attempt <= source.retries; attempt += 1) {
        const remaining = Math.max(0, source.minIntervalMs - (this.now() - source.lastRequestAt));
        if (remaining) await this.sleep(remaining);
        assertActive();
        source.lastRequestAt = this.now();
        try {
        source.state = { ...source.state, status: "running", lastRequestAt: new Date(this.now()).toISOString() };
        const response = await this.fetchImpl(url, {
          headers: { accept: "application/json", "user-agent": this.userAgent, ...headers },
          signal: AbortSignal.timeout(source.timeoutMs)
        });
        if (!response.ok) {
          const error = new Error(`${sourceName} a répondu ${response.status}.`);
          error.status = response.status;
          error.retryAfterMs = retryAfterMilliseconds(response);
          throw error;
        }
        const data = await parse(response);
        assertActive();
        source.state = { ...source.state, status: "ok", successes: source.state.successes + 1, lastError: "", lastSuccessAt: new Date(this.now()).toISOString() };
        // URL instances are not structured-cloneable on newer Node versions.
        // Persist only the JSON-compatible provenance used by the local store.
        if (this.store) await this.store.cacheSet(sourceName, scopedKey, data, ttlMs, { url: String(url) });
        assertActive();
          return { data, provenance: { source: sourceName, cache: "network", observedAt: new Date(this.now()).toISOString(), url: String(url) } };
        } catch (error) {
          assertActive();
          lastError = error;
          const retryable = error.name === "TimeoutError" || error.status === 429 || Number(error.status || 0) >= 500;
          // Do not shorten an upstream rate-limit instruction and retry early;
          // fail this attempt instead of locking the source queue for hours.
          if (attempt < source.retries && retryable && Number(error.retryAfterMs || 0) <= 60_000) {
            await this.sleep(Math.max(Number(error.retryAfterMs || 0), 500 * (2 ** attempt)));
            continue;
          }
          break;
        }
      }

      source.state = { ...source.state, status: "degraded", failures: source.state.failures + 1, lastError: lastError?.message || "Erreur inconnue" };
      assertActive();
      const stale = readCache({ allowStale: true });
      if (stale && ![401, 403].includes(lastError?.status) && this.now() - Number(stale.expiresAt || 0) <= staleMs) {
        return { data: stale.value, provenance: { source: sourceName, cache: "stale", observedAt: new Date(stale.savedAt).toISOString(), warning: source.state.lastError } };
      }
      throw lastError;
    };
    const queued = source.tail.then(execute);
    source.tail = queued.catch(() => {});
    return queued;
  }
}
