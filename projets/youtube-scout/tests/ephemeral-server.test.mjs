import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("HTTP: old archive untouched, per-tab/per-departure isolation, corrections survive restart", async t => {
  const directory = await mkdtemp(join(tmpdir(), "scout-ephemeral-http-"));
  const path = join(directory, "archive.json");
  const archive = JSON.stringify({ entities: { "artist:old": { id: "artist:old", type: "artist", name: "EDGE" } },
    edges: {}, cache: { old: { value: "never reuse" } }, sync: { "digging-front": { seed: { id: "old" } } } });
  await writeFile(path, archive);
  let child;
  async function launch() {
    const probe = http.createServer(); probe.listen(0, "127.0.0.1"); await once(probe, "listening");
    const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
    child = spawn(process.execPath, ["server.mjs"], { cwd: new URL("../", import.meta.url), env: {
      ...process.env, PORT: String(port), SCOUT_DATA_FILE: path,
      DISCOGS_TOKEN: "", DISCOGS_TOKEN_FILE: join(directory, "discogs"),
      SCOUT_GOOGLE_CLIENT_ID: "", SCOUT_GOOGLE_CLIENT_SECRET: "", SCOUT_GOOGLE_TOKEN_FILE: join(directory, "google")
    }, stdio: ["ignore", "pipe", "pipe"] });
    await once(child.stdout, "data"); return `http://localhost:${port}`;
  }
  async function stop() { const exited = once(child, "exit"); child.kill("SIGTERM"); await exited; }
  t.after(async () => { if (child?.exitCode === null) await stop(); });
  let base = await launch();
  const start = async seedId => (await fetch(`${base}/api/exploration/context`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ seedId }) }).then(r => r.json())).token;
  const call = (token, route, body, method = body ? "POST" : "GET") => fetch(`${base}${route}`, { method, headers: { "x-scout-exploration": token, ...(body ? { "content-type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  assert.equal((await fetch(`${base}/api/graph`)).status, 428);
  const seedId = "video:youtube:example01", a = await start(seedId), b = await start("other");
  assert.deepEqual((await call(a, "/api/graph").then(r => r.json())).entities, {});
  assert.equal((await call(a, "/api/graph/ingest", { entities: [{ id: seedId, type: "video", title: "Original" }, { id: "track:auto", type: "track" }] })).status, 200);
  assert.deepEqual((await call(b, "/api/graph").then(r => r.json())).entities, {});
  assert.deepEqual(await readdir(directory), ["archive.json"], "automatic graph ingestion creates no durable file");
  const corrected = await call(a, "/api/departure/correction", { seedId, title: "Corrected", artist: "Chosen", expectedRevision: "" }).then(r => r.json());
  assert.ok(corrected.revision);
  const c = await start(seedId);
  const graph = await call(c, "/api/graph").then(r => r.json());
  assert.equal(graph.entities[seedId].departureCorrection.title, "Corrected");
  assert.equal(graph.entities["track:auto"], undefined);
  assert.equal(graph.entities["artist:old"], undefined);
  assert.equal((await call(a, "/api/exploration/context", null, "DELETE")).status, 200);
  assert.equal((await call(a, "/api/graph")).status, 410);
  assert.equal(await readFile(path, "utf8"), archive);
  await stop(); base = await launch();
  const d = await start(seedId);
  assert.equal((await call(d, "/api/graph").then(r => r.json())).entities[seedId].departureCorrection.artist, "Chosen");
  assert.equal(await readFile(path, "utf8"), archive);
});
