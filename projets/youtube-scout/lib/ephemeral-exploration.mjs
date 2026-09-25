import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { PersistentStore } from "./persistent-store.mjs";
import { personalGraph } from "../public/personal-memory.mjs";

class VolatileStore extends PersistentStore {
  constructor() { super(null); this.loaded = true; }
  async persist() {} // Never creates a file, including through SourceRuntime.
}

export class EphemeralExplorations {
  constructor({ personal, now = Date.now, ttl = 6 * 60 * 60 * 1000, limit = 32 } = {}) {
    this.personal = personal;
    this.now = now; this.ttl = ttl; this.limit = limit;
    this.context = new AsyncLocalStorage();
    this.sessions = new Map();
    // APIs without a departure cannot access a process-wide fallback graph.
    this.empty = new VolatileStore();
    this.store = new Proxy({}, { get: (_, name) => {
      const session = this.context.getStore();
      if (session?.closed) throw Object.assign(new Error("Cette fouille est fermée. Choisissez un nouveau départ."), { httpStatus: 410 });
      if (name === "assertActive") return () => {
        if (session?.closed) throw Object.assign(new Error("Fouille fermée."), { httpStatus: 410 });
      };
      const store = session?.store || this.empty;
      if (name === "ingestGraph" || name === "saveDepartureCorrection") return async delta => {
        if (!session) throw Object.assign(new Error("Ouvrez une fouille éphémère."), { httpStatus: 428 });
        const deliberateInput = personalGraph(delta);
        if (name === "ingestGraph" && !deliberateInput.entities.length && !deliberateInput.edges.length) return store.ingestGraph(delta);
        // Validate first, persist only explicit decisions, then expose the change.
        const probe = new VolatileStore();
        const relevant = new Set([...(delta.entities || []).map(item => item.id), ...deliberateInput.edges.flatMap(item => [item.from, item.to])]);
        for (const id of relevant) if (store.state.entities[id]) probe.state.entities[id] = structuredClone(store.state.entities[id]);
        await probe[name](delta);
        const deliberate = personalGraph({ entities: probe.state.entities, edges: delta.edges || [] });
        const saved = personalGraph(this.personal.snapshot());
        const entityMap = new Map(saved.entities.map(item => [item.id, item]));
        const edgeKey = item => `${item.from}:${item.kind}:${item.to}`;
        const edgeMap = new Map(saved.edges.map(item => [edgeKey(item), item]));
        const changed = deliberate.entities.some(item => JSON.stringify(item) !== JSON.stringify(entityMap.get(item.id))) ||
          deliberate.edges.some(item => JSON.stringify(item) !== JSON.stringify(edgeMap.get(edgeKey(item))));
        if (changed) await this.personal.commitPersonalGraph(deliberate);
        if (session.closed) throw Object.assign(new Error("Fouille fermée."), { httpStatus: 410 });
        return store[name](delta);
      };
      return typeof store[name] === "function" ? store[name].bind(store) : store[name];
    } });
  }
  async start(seedId = "") {
    for (const [token, session] of this.sessions) if (this.now() - session.touched > this.ttl) this.close(token);
    if (this.sessions.size >= this.limit) throw Object.assign(new Error("Trop de fouilles ouvertes. Fermez un onglet ou réessayez plus tard."), { httpStatus: 429 });
    const store = new VolatileStore();
    if (seedId) await store.ingestGraph(personalGraph(this.personal.snapshot(), seedId));
    const token = randomUUID();
    this.sessions.set(token, { store, caches: new Map(), touched: this.now(), seedId, closed: false });
    return token;
  }
  get(token) {
    const session = this.sessions.get(token);
    if (!session || this.now() - session.touched > this.ttl) {
      this.close(token);
      throw Object.assign(new Error("Fouille expirée. Rouvrez ce départ ; vos choix personnels sont conservés."), { httpStatus: 410 });
    }
    session.touched = this.now(); return session;
  }
  close(token) {
    const session = this.sessions.get(token);
    if (session) { session.closed = true; session.caches.clear(); this.sessions.delete(token); }
  }
  cache(name) {
    return new Proxy(new Map(), { get: (empty, key) => {
      const session = this.context.getStore();
      if (session?.closed) throw Object.assign(new Error("Fouille fermée."), { httpStatus: 410 });
      if (session && !session.caches.has(name)) session.caches.set(name, new Map());
      const map = session?.caches.get(name) || empty;
      return typeof map[key] === "function" ? map[key].bind(map) : map[key];
    } });
  }
}
