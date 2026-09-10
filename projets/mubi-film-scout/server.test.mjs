import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile, stat, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

async function freePort() {
  const probe = http.createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const { port } = probe.address();
  await new Promise((resolve) => probe.close(resolve));
  return port;
}

async function startFixtureServer(handler) {
  const server = http.createServer(handler);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return server;
}

function json(response, payload, status = 200) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(payload));
}

async function startApp(t, tmdbRoot, environment = {}) {
  const port = await freePort();
  const sourceConfigPath = join(tmpdir(), `mubi-film-scout-test-${port}.json`);
  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: new URL(".", import.meta.url),
    env: { ...process.env, PORT: String(port), TMDB_ROOT: tmdbRoot, TMDB_READ_TOKEN: "test-token", SOURCE_CONFIG_PATH: sourceConfigPath, ...environment },
    stdio: ["ignore", "pipe", "pipe"]
  });
  t.after(() => child.kill("SIGTERM"));
  t.after(() => unlink(sourceConfigPath).catch(() => {}));
  t.after(() => unlink(`${sourceConfigPath}.tmp`).catch(() => {}));
  await Promise.race([
    once(child.stdout, "data"),
    new Promise((_, reject) => setTimeout(() => reject(new Error("Le serveur de test n’a pas démarré.")), 3000))
  ]);
  return { child, port, sourceConfigPath };
}

test("centralise les accès localement sans jamais les renvoyer au navigateur", async (t) => {
  const fixture = await startFixtureServer((request, response) => json(response, {}));
  t.after(() => fixture.close());
  const { port, sourceConfigPath } = await startApp(t, `http://127.0.0.1:${fixture.address().port}`);

  const saved = await fetch(`http://127.0.0.1:${port}/api/connections/save`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ connections: { guardian: "guardian-secret", nyt: "nyt-secret" } })
  });
  assert.equal(saved.status, 200);
  const savedText = await saved.text();
  assert.equal(savedText.includes("guardian-secret"), false);
  const savedStatus = JSON.parse(savedText).connections;
  assert.equal(savedStatus.tmdb.origin, "environment");
  assert.equal(savedStatus.guardian.configured, true);
  assert.equal((await stat(sourceConfigPath)).mode & 0o777, 0o600);
  assert.match(await readFile(sourceConfigPath, "utf8"), /nyt-secret/);

  const current = await fetch(`http://127.0.0.1:${port}/api/status`).then((response) => response.json());
  assert.equal(current.connections.guardian.configured, true);
  assert.equal(JSON.stringify(current).includes("nyt-secret"), false);

  const cleared = await fetch(`http://127.0.0.1:${port}/api/connections/clear`, { method: "POST" }).then((response) => response.json());
  assert.equal(cleared.connections.guardian.configured, false);
  assert.equal(cleared.connections.tmdb.configured, true);
});

test("sert l’interface avec des en-têtes de sécurité", async (t) => {
  const fixture = await startFixtureServer((request, response) => json(response, {}));
  t.after(() => fixture.close());
  const { port } = await startApp(t, `http://127.0.0.1:${fixture.address().port}`);
  const response = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-security-policy"), /frame-ancestors 'none'/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});

test("expose un diagnostic réseau sans exposer le jeton", async (t) => {
  const fixture = await startFixtureServer((request, response) => {
    const url = new URL(request.url, "http://fixture");
    if (url.pathname === "/configuration") return json(response, { images: {} });
    return json(response, {}, 404);
  });
  t.after(() => fixture.close());
  const { port } = await startApp(t, `http://127.0.0.1:${fixture.address().port}`);
  const response = await fetch(`http://127.0.0.1:${port}/api/diagnostics/run`, { method: "POST" });
  assert.equal(response.status, 200);
  const text = await response.text();
  assert.equal(text.includes("test-token"), false);
  const diagnostics = JSON.parse(text).diagnostics;
  assert.equal(diagnostics.server, true);
  assert.equal(diagnostics.tmdbConfigured, true);
  assert.equal(diagnostics.lastTmdbCheckOk, true);
  assert.equal(typeof diagnostics.lastTmdbLatencyMs, "number");
});

test("explore plusieurs pages avant d’enrichir les candidats", async (t) => {
  const discoveryPages = [];
  const fixture = await startFixtureServer((request, response) => {
    const url = new URL(request.url, "http://fixture");
    if (url.pathname === "/watch/providers/movie") return json(response, { results: [{ provider_id: 11, provider_name: "MUBI" }] });
    if (url.pathname === "/discover/movie") {
      const page = Number(url.searchParams.get("page"));
      discoveryPages.push(page);
      return json(response, {
        total_pages: 5,
        total_results: 5,
        results: [{ id: 200 + page, title: `Film ${page}`, genre_ids: [18], vote_average: 7, vote_count: 50, release_date: "2020-01-01" }]
      });
    }
    if (/^\/movie\/20[1-5]$/.test(url.pathname)) {
      const id = Number(url.pathname.split("/").pop());
      return json(response, {
        id,
        title: `Film ${id - 200}`,
        vote_average: 7,
        vote_count: 50,
        runtime: 90,
        release_date: "2020-01-01",
        "watch/providers": { results: { FR: { flatrate: [{ provider_id: 11 }] } } }
      });
    }
    return json(response, {}, 404);
  });
  t.after(() => fixture.close());
  const { port } = await startApp(t, `http://127.0.0.1:${fixture.address().port}`);
  const response = await fetch(`http://127.0.0.1:${port}/api/search`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ filters: { detour: "faithful" } })
  });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.deepEqual(discoveryPages.sort((a, b) => a - b), [1, 2, 3, 4, 5]);
  assert.deepEqual(payload.exploredPages, [1, 2, 3, 4, 5]);
  assert.equal(payload.exploredCandidates, 5);
  assert.equal(payload.movies.length, 4);
});

test("rejette les origines étrangères et les JSON invalides", async (t) => {
  const fixture = await startFixtureServer((request, response) => json(response, {}));
  t.after(() => fixture.close());
  const { port } = await startApp(t, `http://127.0.0.1:${fixture.address().port}`);
  const foreign = await fetch(`http://127.0.0.1:${port}/api/search`, {
    method: "POST",
    headers: { origin: "https://example.com", "content-type": "application/json" },
    body: "{}"
  });
  assert.equal(foreign.status, 403);
  const invalid = await fetch(`http://127.0.0.1:${port}/api/search`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{"
  });
  assert.equal(invalid.status, 400);
});

test("renvoie des films MUBI enrichis et signale une vérification partielle", async (t) => {
  const calls = [];
  const fixture = await startFixtureServer((request, response) => {
    calls.push(request.url);
    const url = new URL(request.url, "http://fixture");
    if (url.pathname === "/watch/providers/movie") return json(response, { results: [{ provider_id: 11, provider_name: "MUBI" }] });
    if (url.pathname === "/discover/movie") return json(response, {
      page: 1,
      total_pages: 1,
      total_results: 3,
      results: [
        { id: 101, title: "Le calme", original_title: "Le calme", overview: "", release_date: "2020-01-01", vote_average: 7.2, vote_count: 100, genre_ids: [18], popularity: 2 },
        { id: 102, title: "Erreur", original_title: "Erreur", overview: "", release_date: "2021-01-01", vote_average: 7.4, vote_count: 100, genre_ids: [878], popularity: 20 },
        { id: 103, title: "Trop long", original_title: "Trop long", overview: "", release_date: "2019-01-01", vote_average: 7.3, vote_count: 100, genre_ids: [18], popularity: 3 }
      ]
    });
    if (url.pathname === "/movie/101") return json(response, {
      id: 101,
      title: "Le calme",
      original_title: "Le calme",
      release_date: "2020-01-01",
      vote_average: 7.2,
      vote_count: 100,
      runtime: 80,
      poster_path: "/poster.jpg",
      keywords: { keywords: [{ name: "meditation" }] },
      "watch/providers": { results: { FR: { link: "https://www.themoviedb.org/movie/101/watch?locale=FR", flatrate: [{ provider_id: 11 }] } } }
    });
    if (url.pathname === "/movie/102") return json(response, { status_message: "temporary" }, 503);
    if (url.pathname === "/movie/103") return json(response, {
      id: 103,
      title: "Trop long",
      original_title: "Trop long",
      release_date: "2019-01-01",
      vote_average: 7.3,
      vote_count: 100,
      runtime: 110,
      keywords: { keywords: [] },
      "watch/providers": { results: { FR: { link: "https://www.themoviedb.org/movie/103/watch?locale=FR", flatrate: [{ provider_id: 11 }] } } }
    });
    return json(response, {}, 404);
  });
  t.after(() => fixture.close());
  const { port } = await startApp(t, `http://127.0.0.1:${fixture.address().port}`);
  const response = await fetch(`http://127.0.0.1:${port}/api/search`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      wish: "un film contemplatif",
      filters: { effect: "captivate", timeBudget: "short", detour: "sidestep" }
    })
  });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.movies.length, 1);
  assert.equal(payload.movies[0].id, 101);
  assert.equal(payload.movies[0].role.id, "match");
  assert.ok(payload.applied.some((label) => label.startsWith("≈")));
  assert.equal(payload.applied.some((label) => label.startsWith("↗")), false);
  assert.equal(payload.filters.effect, "captivate");
  assert.equal(payload.filters.maxRuntime, 90);
  assert.ok(Array.isArray(payload.movies[0].why));
  assert.deepEqual(payload.warnings, ["1 disponibilité n’a pas pu être vérifiée."]);
  assert.equal(calls.filter((url) => url.startsWith("/watch/providers/movie")).length, 1);
});

test("renvoie une erreur technique si toutes les vérifications échouent", async (t) => {
  const fixture = await startFixtureServer((request, response) => {
    const url = new URL(request.url, "http://fixture");
    if (url.pathname === "/watch/providers/movie") return json(response, { results: [{ provider_id: 11, provider_name: "MUBI" }] });
    if (url.pathname === "/discover/movie") return json(response, {
      total_pages: 1,
      total_results: 1,
      results: [{ id: 999, title: "Erreur", genre_ids: [] }]
    });
    return json(response, { status_message: "temporary" }, 503);
  });
  t.after(() => fixture.close());
  const { port } = await startApp(t, `http://127.0.0.1:${fixture.address().port}`);
  const response = await fetch(`http://127.0.0.1:${port}/api/search`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}"
  });
  assert.equal(response.status, 502);
  assert.match((await response.json()).message, /n’a pas pu vérifier/);
});

test("branche Guardian, NYT et OMDb sur les propositions finales sans exposer les clés", async (t) => {
  const fixture = await startFixtureServer((request, response) => {
    const url = new URL(request.url, "http://fixture");
    if (url.pathname === "/configuration") return json(response, { images: {} });
    if (url.pathname === "/watch/providers/movie") return json(response, { results: [{ provider_id: 11, provider_name: "MUBI" }] });
    if (url.pathname === "/discover/movie") return json(response, {
      total_pages: 1,
      total_results: 1,
      results: [{ id: 700, title: "Anatomie d’une chute", original_title: "Anatomy of a Fall", release_date: "2023-08-23", vote_average: 7.6, vote_count: 1000, genre_ids: [18] }]
    });
    if (url.pathname === "/movie/700") return json(response, {
      id: 700,
      title: "Anatomie d’une chute",
      original_title: "Anatomy of a Fall",
      release_date: "2023-08-23",
      vote_average: 7.6,
      vote_count: 1000,
      runtime: 151,
      external_ids: { imdb_id: "tt17009710" },
      "watch/providers": { results: { FR: { flatrate: [{ provider_id: 11 }] } } }
    });
    if (url.pathname === "/guardian") return json(response, { response: { status: "ok", results: [{
      webTitle: "Anatomy of a Fall review – gripping",
      webUrl: "https://www.theguardian.com/film/example",
      fields: { starRating: "5", headline: "Anatomy of a Fall review", trailText: "A precise verdict." }
    }] } });
    if (url.pathname === "/nyt") return json(response, { status: "OK", response: { docs: [{
      headline: { main: "‘Anatomy of a Fall’ Review" },
      abstract: "Ambiguity in the courtroom.",
      web_url: "https://www.nytimes.com/2023/10/12/movies/anatomy-of-a-fall-review.html"
    }] } });
    if (url.pathname === "/omdb") return json(response, {
      Response: "True",
      Title: "Anatomy of a Fall",
      imdbID: "tt17009710",
      Ratings: [{ Source: "Internet Movie Database", Value: "7.6/10" }],
      Awards: "Won 1 Oscar."
    });
    return json(response, {}, 404);
  });
  t.after(() => fixture.close());
  const fixtureRoot = `http://127.0.0.1:${fixture.address().port}`;
  const { port } = await startApp(t, fixtureRoot, {
    GUARDIAN_ROOT: `${fixtureRoot}/guardian`,
    NYT_ROOT: `${fixtureRoot}/nyt`,
    OMDB_ROOT: `${fixtureRoot}/omdb`,
    GUARDIAN_API_KEY: "guardian-test-secret",
    NYT_API_KEY: "nyt-test-secret",
    OMDB_API_KEY: "omdb-test-secret"
  });
  const response = await fetch(`http://127.0.0.1:${port}/api/search`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ filters: { maxRuntime: 180 } })
  });
  assert.equal(response.status, 200);
  const text = await response.text();
  assert.equal(text.includes("test-secret"), false);
  const payload = JSON.parse(text);
  assert.deepEqual(payload.movies[0].perspectives.map(({ source }) => source), ["guardian", "nyt", "omdb"]);
  assert.equal(payload.sourceCoverage.guardian.matched, 1);
  assert.equal(payload.sourceCoverage.nyt.matched, 1);
  assert.equal(payload.sourceCoverage.omdb.matched, 1);

  const diagnosticResponse = await fetch(`http://127.0.0.1:${port}/api/diagnostics/run`, { method: "POST" });
  assert.equal(diagnosticResponse.status, 200);
  const diagnosticText = await diagnosticResponse.text();
  assert.equal(diagnosticText.includes("test-secret"), false);
  const diagnostic = JSON.parse(diagnosticText);
  assert.equal(diagnostic.summary.operational, 4);
  assert.deepEqual(
    Object.fromEntries(Object.entries(diagnostic.diagnostics.sourceChecks).map(([id, state]) => [id, state.ok])),
    { tmdb: true, guardian: true, nyt: true, omdb: true }
  );
});
