import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const EMPTY = Object.freeze({
  schemaVersion: 1,
  cache: {},
  entities: {},
  claims: {},
  edges: {},
  observations: [],
  events: [],
  jobs: {},
  sync: {}
});

function clone(value) {
  return structuredClone(value);
}

function safeId(value = "") {
  // IDs are exact keys, not slugs: replacement/truncation merges distinct
  // records and leaves edge references pointing at keys which no longer exist.
  const id = String(value);
  if (!id || id.length > 4096 || /[\u0000-\u001f]/.test(id) || ["prototype", ...Object.getOwnPropertyNames(Object.prototype)].includes(id)) throw Object.assign(new Error("Identifiant local invalide."), { httpStatus: 400 });
  return id;
}

export class PersistentStore {
  constructor(pathname, { now = () => Date.now(), maxEvents = 10_000, maxObservations = 20_000 } = {}) {
    this.pathname = pathname;
    this.now = now;
    this.maxEvents = maxEvents;
    this.maxObservations = maxObservations;
    this.state = clone(EMPTY);
    this.loaded = false;
    this.writeTail = Promise.resolve();
    this.decisionTail = Promise.resolve();
  }

  async load() {
    if (this.loaded) return this;
    try {
      const parsed = JSON.parse(await readFile(this.pathname, "utf8"));
      this.state = { ...clone(EMPTY), ...parsed };
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    this.loaded = true;
    return this;
  }

  async persist(state = null) {
    await this.load();
    const snapshot = JSON.stringify(state || this.state, null, 2);
    this.writeTail = this.writeTail.catch(() => {}).then(async () => {
      await mkdir(dirname(this.pathname), { recursive: true });
      const temporary = `${this.pathname}.tmp`;
      await writeFile(temporary, snapshot, { mode: 0o600 });
      await rename(temporary, this.pathname);
    });
    return this.writeTail;
  }

  cacheGet(source, key, { allowStale = false } = {}) {
    const entry = this.state.cache?.[`${source}:${key}`];
    if (!entry) return null;
    const stale = Number(entry.expiresAt || 0) <= this.now();
    return stale && !allowStale ? null : { ...clone(entry), stale };
  }

  async cacheSet(source, key, value, ttlMs, metadata = {}) {
    const savedAt = this.now();
    this.state.cache[`${source}:${key}`] = { value, savedAt, expiresAt: savedAt + ttlMs, ...metadata };
    await this.persist();
    return value;
  }

  async putEntity(entity) {
    if (!entity?.id || !entity?.type) throw new Error("Une entité exige un id et un type.");
    const id = safeId(entity.id);
    const previous = this.state.entities[id] || {};
    this.state.entities[id] = { ...previous, ...clone(entity), id, updatedAt: new Date(this.now()).toISOString() };
    await this.persist();
    return this.state.entities[id];
  }

  async putClaim(claim) {
    if (!claim?.subject || !claim?.field || !claim?.source) throw new Error("Un claim exige subject, field et source.");
    const id = safeId(claim.id || `${claim.subject}:${claim.field}:${claim.source}:${JSON.stringify(claim.value)}`);
    this.state.claims[id] = { ...clone(claim), id, observedAt: claim.observedAt || new Date(this.now()).toISOString() };
    await this.persist();
    return this.state.claims[id];
  }

  async putEdge(edge) {
    if (!edge?.from || !edge?.to || !edge?.kind) throw new Error("Une arête exige from, to et kind.");
    const id = safeId(edge.id || `${edge.from}:${edge.kind}:${edge.to}`);
    await this.ingestGraph({ edges: [{ ...edge, id }] });
    return this.state.edges[id];
  }

  async addObservation(observation) {
    this.state.observations.push({ ...clone(observation), observedAt: observation.observedAt || new Date(this.now()).toISOString() });
    this.state.observations = this.state.observations.slice(-this.maxObservations);
    await this.persist();
  }

  async addEvent(event) {
    const allowed = new Set(["opened", "keep", "not_now", "too_obvious", "wrong_identity", "wrong_path"]);
    if (!allowed.has(event?.kind)) throw new Error("Type de retour utilisateur invalide.");
    const saved = { ...clone(event), id: safeId(event.id || `${this.now()}:${Math.random()}`), at: event.at || new Date(this.now()).toISOString() };
    this.state.events.push(saved);
    this.state.events = this.state.events.slice(-this.maxEvents);
    await this.persist();
    return saved;
  }

  async setSync(key, value) {
    this.state.sync[safeId(key)] = { ...clone(value), updatedAt: new Date(this.now()).toISOString() };
    await this.persist();
    return this.state.sync[safeId(key)];
  }

  getSync(key) {
    const value = this.state.sync[safeId(key)];
    return value ? clone(value) : null;
  }

  async deleteSync(key) {
    const id = safeId(key);
    const existed = Boolean(this.state.sync[id]);
    delete this.state.sync[id];
    await this.persist();
    return existed;
  }

  // Used only by the isolated personal-decision store (no provider cache).
  // Prepare the complete batch outside live state; publish after durable success.
  // Serialisation prevents a failed batch from contaminating a later decision.
  async commitPersonalGraph(delta) {
    const input = clone(delta);
    const operation = this.decisionTail.catch(() => {}).then(async () => {
      const staged = new PersistentStore(null, { now: this.now });
      staged.loaded = true;
      staged.state = clone(this.state);
      staged.persist = async () => {};
      await staged.ingestGraph(input);
      await this.persist(staged.state);
      this.state = staged.state;
      return this.stats();
    });
    this.decisionTail = operation;
    return operation;
  }

  async saveDepartureCorrection(delta) {
    const entity = delta.entities[0], previous = this.state.entities[entity.id];
    try { return await this.ingestGraph(delta); }
    catch (error) {
      // A failed disk write must not become a successful correction on the next
      // unrelated save. Never roll back a newer edit from another local client.
      if (this.state.entities[entity.id]?.departureCorrection?.revision === entity.departureCorrection.revision) {
        if (previous) this.state.entities[entity.id] = previous;
        else delete this.state.entities[entity.id];
      }
      throw error;
    }
  }

  async ingestGraph({ entities = [], claims = [], edges = [] } = {}) {
    if (![entities, claims, edges].every(Array.isArray)) throw Object.assign(new Error("Les entités, crédits et relations doivent être des listes."), { httpStatus: 400 });
    // Clone and validate the entire batch before touching any table. A bad
    // edge must not leave preceding entities in memory for the next save.
    ({ entities, claims, edges } = clone({ entities, claims, edges }));
    for (const item of [...entities, ...claims, ...edges]) {
      if (item?.id) safeId(item.id);
      if (item?.evidence != null && !Array.isArray(item.evidence)) throw Object.assign(new Error("Les preuves doivent être une liste."), { httpStatus: 400 });
    }
    for (const claim of claims) if (claim?.subject && claim?.field && claim?.source) {
      safeId(claim.subject);
      safeId(claim.id || `${claim.subject}:${claim.field}:${claim.source}:${JSON.stringify(claim.value)}`);
    }
    for (const edge of edges) if (edge?.from && edge?.to && edge?.kind) {
      safeId(edge.from); safeId(edge.to);
      safeId(edge.id || `${edge.from}:${edge.kind}:${edge.to}`);
    }
    const updatedAt = new Date(this.now()).toISOString();
    for (const entity of entities) {
      if (!entity?.id || !entity?.type) continue;
      const id = safeId(entity.id);
      this.state.entities[id] = { ...(this.state.entities[id] || {}), ...clone(entity), id, updatedAt };
    }
    for (const claim of claims) {
      if (!claim?.subject || !claim?.field || !claim?.source) continue;
      const id = safeId(claim.id || `${claim.subject}:${claim.field}:${claim.source}:${JSON.stringify(claim.value)}`);
      this.state.claims[id] = { ...clone(claim), id, observedAt: claim.observedAt || updatedAt };
    }
    // Decisions concern a relation, not its historical storage key. This also
    // protects old normalized IDs when a new exact key reaches the same edge.
    const decisions = new Map();
    const relationKey = edge => JSON.stringify([edge.from, edge.kind, edge.to]);
    for (const saved of Object.values(this.state.edges)) {
      if (!["probable_artist", "same_identity"].includes(saved.kind) || !["confirmed_user", "rejected_user"].includes(saved.status)) continue;
      const key = relationKey(saved), previous = decisions.get(key);
      if (!previous || (saved.updatedAt || "") >= (previous.updatedAt || "")) decisions.set(key, saved);
    }
    for (const edge of edges) {
      if (!edge?.from || !edge?.to || !edge?.kind) continue;
      const id = safeId(edge.id || `${edge.from}:${edge.kind}:${edge.to}`);
      const previous = decisions.get(relationKey(edge)) || this.state.edges[id] || {};
      const incoming = clone(edge);
      // Automated enrichment must not undo an explicit identity decision.
      // An explicit user rejection can revoke a previous confirmation, and
      // automated enrichment must not silently resurrect a rejected identity.
      const identityDecision = ["probable_artist", "same_identity"].includes(edge.kind) &&
        (!this.state.entities[edge.from]?.departureCorrection?.revision || previous.departureRevision === this.state.entities[edge.from].departureCorrection.revision);
      const explicitRejection =
        incoming.status === "rejected_user" &&
        (incoming.evidence || []).includes("user_rejection");

      if (
        identityDecision &&
        previous.status === "confirmed_user" &&
        incoming.status !== "confirmed_user" &&
        !explicitRejection
      ) {
        incoming.status = previous.status;
        incoming.evidence = [...new Set([...(previous.evidence || []), ...(incoming.evidence || [])])];
      }

      if (
        identityDecision &&
        previous.status === "rejected_user" &&
        !["confirmed_user", "rejected_user"].includes(incoming.status)
      ) {
        incoming.status = previous.status;
        incoming.evidence = [...new Set([...(previous.evidence || []), ...(incoming.evidence || [])])];
      }
      this.state.edges[id] = { ...previous, ...incoming, id, updatedAt };
      if (["confirmed_user", "rejected_user"].includes(incoming.status)) decisions.set(relationKey(edge), this.state.edges[id]);
    }
    await this.persist();
    return this.stats();
  }

  snapshot({ includeCache = false } = {}) {
    // The provider cache is not part of the exploration graph. Do not clone
    // megabytes of responses only to discard them on every graph refresh.
    const { cache, ...graph } = this.state;
    return clone(includeCache ? this.state : graph);
  }

  stats() {
    return {
      entities: Object.keys(this.state.entities).length,
      claims: Object.keys(this.state.claims).length,
      edges: Object.keys(this.state.edges).length,
      observations: this.state.observations.length,
      events: this.state.events.length,
      cacheEntries: Object.keys(this.state.cache).length,
      syncScopes: Object.keys(this.state.sync).length
    };
  }
}
