import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { PersistentStore } from "./persistent-store.mjs";

test("graph snapshots do not clone provider caches and remain isolated", () => {
  const store = new PersistentStore("unused");
  store.state.entities.a = { id: "a", type: "artist", name: "Original" };
  // A non-cloneable sentinel detects even an attempted copy of the cache.
  store.state.cache = { sentinel: () => {} };
  const snapshot = store.snapshot();
  assert.equal(snapshot.cache, undefined);
  snapshot.entities.a.name = "Changed";
  assert.equal(store.state.entities.a.name, "Original");
  store.state.cache = { entry: { value: { title: "Cached" } } };
  const backup = store.snapshot({ includeCache: true });
  backup.cache.entry.value.title = "Changed";
  assert.equal(store.state.cache.entry.value.title, "Cached");
});

test("une erreur d’écriture n’empoisonne pas les sauvegardes suivantes", async t => {
  const directory = await mkdtemp(join(tmpdir(), "scout-write-retry-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const pathname = join(directory, "store.json");
  const store = await new PersistentStore(pathname).load();
  await mkdir(`${pathname}.tmp`);
  await assert.rejects(store.setSync("scope", { value: "first" }));
  await rm(`${pathname}.tmp`, { recursive: true });
  await store.setSync("scope", { value: "second" });
  assert.equal(JSON.parse(await readFile(pathname, "utf8")).sync.scope.value, "second");
});

test("les clés réservées et lots malformés sont refusés sans mutation partielle", async t => {
  const directory = await mkdtemp(join(tmpdir(), "scout-key-guard-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const store = await new PersistentStore(join(directory, "state.json")).load();
  await assert.rejects(store.ingestGraph({ entities: [{ id: "valid", type: "artist" }, { id: "__proto__", type: "artist" }] }), /invalide/);
  assert.equal(store.stats().entities, 0);
  await assert.rejects(store.setSync("constructor", {}), /invalide/);
  await assert.rejects(store.ingestGraph({ entities: {} }), /listes/);
});

test("persiste atomiquement graphe, événements et synchronisation", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "youtube-scout-store-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const pathname = join(directory, "store.json");
  const store = await new PersistentStore(pathname, { now: () => 1_700_000_000_000 }).load();
  await store.ingestGraph({
    entities: [{ id: "artist:mb:a", type: "artist", name: "A" }, { id: "recording:mb:r", type: "recording", title: "R" }],
    claims: [{ subject: "artist:mb:a", field: "name", value: "A", source: "musicbrainz" }],
    edges: [{ from: "artist:mb:a", to: "recording:mb:r", kind: "credited_on" }]
  });
  await store.addEvent({ kind: "keep", targetId: "recording:mb:r" });
  await store.setSync("youtube", { videos: 5000 });
  const reloaded = await new PersistentStore(pathname).load();
  assert.deepEqual(reloaded.stats(), { entities: 2, claims: 1, edges: 1, observations: 0, events: 1, cacheEntries: 0, syncScopes: 1 });
  assert.equal(reloaded.snapshot().sync.youtube.videos, 5000);
  assert.equal(reloaded.getSync("youtube").videos, 5000);
  assert.equal(await reloaded.deleteSync("youtube"), true);
  assert.equal(reloaded.getSync("youtube"), null);
  assert.doesNotMatch(await readFile(pathname, "utf8"), /undefined/);
});

test("refuse les événements qui simuleraient une sémantique inconnue", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "youtube-scout-store-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const store = await new PersistentStore(join(directory, "store.json")).load();
  await assert.rejects(() => store.addEvent({ kind: "like", targetId: "x" }), /invalide/);
});

test("un enrichissement automatique ne rétrograde pas une confirmation utilisateur", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "youtube-scout-confirmation-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const pathname = join(directory, "store.json");
  const store = await new PersistentStore(pathname).load();
  const edge = { from: "video:a", to: "artist:a", kind: "probable_artist" };
  await store.ingestGraph({ edges: [{ ...edge, status: "confirmed_user", evidence: ["user_confirmation"] }] });
  await store.ingestGraph({ edges: [{ ...edge, status: "single_source", evidence: ["musicbrainz"] }] });
  const reloaded = await new PersistentStore(pathname).load();
  const saved = Object.values(reloaded.snapshot().edges)[0];
  assert.equal(saved.status, "confirmed_user");
  assert.ok(saved.evidence.includes("user_confirmation"));
});
