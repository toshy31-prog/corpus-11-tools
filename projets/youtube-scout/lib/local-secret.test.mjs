import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { LocalSecretFile, normalizeSecret } from "./local-secret.mjs";

test("écrit, relit et supprime un secret local avec des permissions restrictives", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "youtube-scout-secret-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const filePath = join(directory, "private", "discogs-token");
  const store = new LocalSecretFile(filePath);
  const token = "a".repeat(40);

  assert.equal(await store.load(), "");
  await store.save(token);
  assert.equal(await store.load(), token);
  assert.equal((await readFile(filePath, "utf8")).trim(), token);
  assert.equal((await stat(filePath)).mode & 0o777, 0o600);
  assert.equal((await stat(join(directory, "private"))).mode & 0o777, 0o700);

  await store.remove();
  assert.equal(await store.load(), "");
});

test("refuse les valeurs qui ne ressemblent pas à un jeton", () => {
  assert.throws(() => normalizeSecret("court"), /incomplet/);
  assert.throws(() => normalizeSecret(`a${"b".repeat(30)} c`), /inattendus/);
});
