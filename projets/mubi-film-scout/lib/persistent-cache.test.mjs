import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, stat, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createPersistentCache } from "./persistent-cache.mjs";

test("cache persistant : redémarrage, expiration, permissions et absence de clé brute", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "scout-cache-test-")); t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, "cache.json"); let time = 100;
  const cache = createPersistentCache(path, { now: () => time });
  await cache.set("https://api.invalid?key=super-secret", { title: "Film" }, 100);
  const next = createPersistentCache(path, { now: () => time });
  assert.equal((await next.get("https://api.invalid?key=super-secret")).data.title, "Film");
  assert.equal((await readFile(path, "utf8")).includes("super-secret"), false);
  assert.equal((await stat(path)).mode & 0o777, 0o600);
  time = 201; assert.equal(await next.get("https://api.invalid?key=super-secret"), null);
});
test("un cache corrompu ne bloque pas le moteur ; les écritures parallèles sont sérialisées", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "scout-cache-test-")); t.after(() => rm(dir, { recursive: true, force: true }));
  const path = join(dir, "cache.json"); await writeFile(path, "bad-json");
  const cache = createPersistentCache(path);
  assert.equal(await cache.get("absent"), null);
  await Promise.all([cache.set("a", 1, 10000), cache.set("b", 2, 10000)]);
  const next = createPersistentCache(path); assert.equal((await next.get("a")).data, 1); assert.equal((await next.get("b")).data, 2);
});
