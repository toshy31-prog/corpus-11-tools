import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { departureArtistsUpdate, declaredDepartureArtist } from "../public/departure-workflow.mjs";
import { departureArtistIds } from "../public/music-sorting.mjs";

test("HTTP : choix de trois artistes persistés ensemble, crédits complets et archive préservés après redémarrage", async t => {
  const directory = await mkdtemp(join(tmpdir(), "scout-multi-http-")), path = join(directory, "archive.json");
  const archive = JSON.stringify({ entities: {}, edges: {}, sync: {}, cache: {} });
  await writeFile(path, archive);
  let child, base;
  async function launch() {
    const probe = http.createServer(); probe.listen(0, "127.0.0.1"); await once(probe, "listening");
    const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
    child = spawn(process.execPath, ["server.mjs"], { cwd: new URL("../", import.meta.url), env: {
      ...process.env, PORT: String(port), SCOUT_DATA_FILE: path,
      DISCOGS_TOKEN: "", DISCOGS_TOKEN_FILE: join(directory, "no-discogs"),
      SCOUT_GOOGLE_CLIENT_ID: "", SCOUT_GOOGLE_CLIENT_SECRET: "", SCOUT_GOOGLE_TOKEN_FILE: join(directory, "no-google")
    }, stdio: ["ignore", "pipe", "pipe"] });
    await once(child.stdout, "data"); base = `http://localhost:${port}`;
  }
  async function stop() { const exited = once(child, "exit"); child.kill("SIGTERM"); await exited; }
  t.after(async () => { if (child?.exitCode === null) await stop(); });
  const seed = { id: "video:youtube:fixture1234", type: "video", title: "Saboteur" };
  const credit = "Deen Burbigo, Eff Gee, Ratu$, Esso Luxueux, Stutt, robdbloc, Blaz Pit";
  const choices = ["Deen Burbigo", "Eff Gee", "Blaz Pit"].map((name, i) => ({ id: `artist:discogs:${i + 1}`, entity: { id: `artist:discogs:${i + 1}`, type: "artist", name } }));
  const start = async seedId => (await fetch(`${base}/api/exploration/context`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ seedId }) }).then(r => r.json())).token;
  const call = (token, route, body) => fetch(`${base}${route}`, { method: body ? "POST" : "GET", headers: { "x-scout-exploration": token, ...(body ? { "content-type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  await launch();
  let token = await start(seed.id);
  assert.equal((await call(token, "/api/graph/ingest", { entities: [seed] })).status, 200);
  let graph = await call(token, "/api/graph").then(r => r.json());
  assert.equal((await call(token, "/api/graph/ingest", departureArtistsUpdate(graph, seed, credit, choices))).status, 200);
  await stop(); await launch(); token = await start(seed.id);
  graph = await call(token, "/api/graph").then(r => r.json());
  assert.equal(declaredDepartureArtist(graph, seed.id), credit);
  assert.deepEqual(departureArtistIds(graph, seed.id).sort(), choices.map(c => c.id));
  const other = await start("video:youtube:otherseed");
  assert.deepEqual((await call(other, "/api/graph").then(r => r.json())).entities, {});
  assert.equal(await readFile(path, "utf8"), archive);
});
