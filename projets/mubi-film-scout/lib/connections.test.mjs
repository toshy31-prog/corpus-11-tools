import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createConnectionStore } from "./connections.mjs";

test("enregistre les accès sans les exposer dans le statut", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "mubi-sources-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const filePath = join(directory, "sources.json");
  const store = createConnectionStore(filePath, { TMDB_READ_TOKEN: "tmdb-env" });

  const status = await store.save({ guardian: "guardian-secret", omdb: "omdb-secret" });
  assert.deepEqual(status.tmdb, { configured: true, origin: "environment" });
  assert.deepEqual(status.guardian, { configured: true, origin: "local" });
  assert.equal(JSON.stringify(status).includes("secret"), false);
  assert.equal((await stat(filePath)).mode & 0o777, 0o600);
  assert.match(await readFile(filePath, "utf8"), /guardian-secret/);
  assert.equal(await store.get("tmdb"), "tmdb-env");
});

test("préserve les champs absents et permet d’oublier le coffre local", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "mubi-sources-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const store = createConnectionStore(join(directory, "sources.json"), {});

  await store.save({ tmdb: "first", guardian: "critic" });
  await store.save({ tmdb: "second", guardian: "" });
  assert.equal(await store.get("tmdb"), "second");
  assert.equal(await store.get("guardian"), "critic");

  const status = await store.clear();
  assert.equal(status.tmdb.configured, false);
  assert.equal(status.guardian.configured, false);
});

test("refuse les secrets contenant des caractères de contrôle", async () => {
  const store = createConnectionStore(join(tmpdir(), "unused-mubi-sources.json"), {});
  await assert.rejects(() => store.save({ tmdb: "abc\ndef" }), /caractères invalides/);
});
