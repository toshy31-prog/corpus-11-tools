import test from "node:test";
import assert from "node:assert/strict";
import { PersistentStore } from "./persistent-store.mjs";
import { EphemeralExplorations } from "./ephemeral-exploration.mjs";
import { personalGraph } from "../public/personal-memory.mjs";

function setup(options = {}) {
  const personal = new PersistentStore(null); personal.loaded = true;
  let writes = 0; personal.persist = async () => { writes++; };
  const digs = new EphemeralExplorations({ personal, ...options });
  const run = (token, fn) => digs.context.run(digs.get(token), fn);
  return { personal, digs, run, writes: () => writes };
}
test("fresh departures exclude old catalogue neighbours and preserve only deliberate choices", async () => {
  const { personal, digs, run, writes } = setup();
  const seed = { id: "video:youtube:example01", type: "video", title: "Before", departureCorrection: { source: "user", title: "Corrected", artist: "Chosen", revision: "r1" } };
  const archive = { entities: [seed, { id: "artist:discogs:1", type: "artist", name: "Chosen" }, { id: "artist:discogs:2", type: "artist", name: "EDGE" }], edges: [
    { from: seed.id, to: "artist:discogs:1", kind: "probable_artist", status: "confirmed_user" },
    { from: "artist:discogs:1", to: "artist:discogs:2", kind: "collaborated_with", status: "observed" }
  ] };
  await personal.ingestGraph(personalGraph(archive));
  const a = await digs.start(seed.id), b = await digs.start("different");
  assert.equal(run(a, () => digs.store.snapshot()).entities[seed.id].departureCorrection.title, "Corrected");
  assert.equal(run(a, () => digs.store.snapshot()).entities["artist:discogs:2"], undefined);
  assert.deepEqual(run(b, () => digs.store.snapshot()).entities, {});
  const before = writes();
  await run(a, () => digs.store.ingestGraph({ entities: [{ id: "track:auto", type: "track" }] }));
  await run(a, () => digs.store.cacheSet("provider", "same-url", { old: true }, 5000));
  assert.equal(writes(), before, "automatic ingestion and cache never write durable storage");
  assert.equal(run(b, () => digs.store.cacheGet("provider", "same-url")), null);
  assert.equal(run(b, () => digs.store.snapshot()).entities["track:auto"], undefined);
});
test("closing isolates late async work, maps and cursors; expiry is enforced", async () => {
  let now = 1;
  const { digs, run } = setup({ now: () => now, ttl: 100 });
  const a = await digs.start(), cache = digs.cache("identity");
  await run(a, () => digs.store.cacheSet("catalogue_cursor", "cursor", { old: true }, 999));
  run(a, () => cache.set("name", "old"));
  let release; const wait = new Promise(resolve => { release = resolve; });
  const late = run(a, async () => { await wait; return digs.store.ingestGraph({ entities: [{ id: "late", type: "artist" }] }); });
  digs.close(a); const b = await digs.start(); release();
  await assert.rejects(late, { httpStatus: 410 });
  assert.equal(run(b, () => cache.get("name")), undefined);
  assert.equal(run(b, () => digs.store.cacheGet("catalogue_cursor", "cursor")), null);
  now = 102; assert.throws(() => digs.get(b), { httpStatus: 410 });
});
test("concurrent enrichment merges without losing another direction", async () => {
  const { digs, run } = setup(); const a = await digs.start();
  await Promise.all(Array.from({ length: 20 }, (_, i) => run(a, () => digs.store.ingestGraph({ entities: [{ id: `track:${i}`, type: "track" }] }))));
  assert.equal(run(a, () => digs.store.stats()).entities, 20);
});
test("automatic ingestion does not clone unrelated accumulated state", async () => {
  const { digs, run } = setup(); const a = await digs.start();
  const state = digs.get(a).store.state;
  Object.defineProperty(state.entities, "unrelated", { enumerable: true, get() { throw new Error("unrelated entity traversed"); } });
  await run(a, () => digs.store.ingestGraph({ entities: [{ id: "new", type: "track" }] }));
  assert.equal(state.entities.new.id, "new");
});
test("failed durable correction is not exposed or retained in personal memory", async () => {
  const { personal, digs, run } = setup(); const a = await digs.start();
  personal.persist = async () => { throw new Error("disk full"); };
  await assert.rejects(run(a, () => digs.store.saveDepartureCorrection({ entities: [{ id: "video:1", type: "video", departureCorrection: { source: "user", title: "Corrected", revision: "r1" } }] })), /disk full/);
  assert.equal(personal.state.entities["video:1"], undefined);
  assert.equal(run(a, () => digs.store.snapshot()).entities["video:1"], undefined);
});
