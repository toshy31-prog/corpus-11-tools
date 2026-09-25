import test from "node:test";
import assert from "node:assert/strict";
import { createExternalSourceClient, guardianReview, nytReview, omdbReception, titleMatches } from "./external-sources.mjs";

const movie = {
  id: 1,
  title: "Anatomie d’une chute",
  originalTitle: "Anatomy of a Fall",
  releaseDate: "2023-08-23",
  imdbId: "tt17009710"
};

function response(payload, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload };
}

test("récupère une coupure réseau avec une seule relance et le même délai total", async () => {
  const signals = [];
  const client = createExternalSourceClient({ fetchImpl: async (_, options) => {
    signals.push(options.signal);
    if (signals.length === 1) throw new TypeError("fetch failed");
    return response({ Title: movie.originalTitle, imdbID: movie.imdbId, Ratings: [] });
  } });
  const result = await client.enrich([movie], { omdb: "secret" });
  assert.equal(signals.length, 2);
  assert.equal(signals[0], signals[1]);
  assert.equal(result.coverage.omdb.matched, 1);
  assert.equal(result.coverage.omdb.failed, 0);
});

test("ne relance ni une clé refusée ni un quota épuisé et conserve les films", async () => {
  for (const [status, code] of [[401, "access"], [403, "access"], [429, "quota"]]) {
    let calls = 0;
    const client = createExternalSourceClient({ fetchImpl: async () => {
      calls += 1;
      return response({}, status);
    } });
    const result = await client.enrich([movie], { nyt: "secret" });
    assert.equal(calls, 1);
    assert.equal(result.movies[0].id, movie.id);
    assert.equal(result.coverage.nyt.errors[0].code, code);
    assert.equal(JSON.stringify(result).includes("secret"), false);
  }
});

test("distingue une absence de critique d’un échec persistant sans divulguer l’erreur brute", async () => {
  let failures = 0;
  const client = createExternalSourceClient({ fetchImpl: async (url) => {
    if (url.hostname === "api.nytimes.com") return response({ status: "OK", response: { docs: [] } });
    failures += 1;
    throw new TypeError("URL sensible ?apikey=secret");
  } });
  const result = await client.enrich([movie], { nyt: "secret", omdb: "secret" });
  assert.equal(failures, 2);
  assert.equal(result.coverage.nyt.failed, 0);
  assert.equal(result.coverage.nyt.matched, 0);
  assert.equal(result.coverage.omdb.failed, 1);
  assert.equal(result.coverage.omdb.errors[0].code, "network");
  assert.equal(JSON.stringify(result).includes("secret"), false);
});

test("reconnaît les erreurs OMDb renvoyées avec HTTP 200", async () => {
  const client = createExternalSourceClient({ fetchImpl: async () => response({ Response: "False", Error: "Request limit reached!" }) });
  const result = await client.enrich([movie], { omdb: "secret" });
  assert.equal(result.coverage.omdb.errors[0].code, "quota");
});

test("partage le budget NYT entre diagnostic et recherches sans bloquer les films", async () => {
  let time = 100_000;
  const starts = [];
  const client = createExternalSourceClient({ now: () => time, sleep: async (ms) => { time += ms; }, fetchImpl: async () => {
    starts.push(time);
    return response({ status: "OK", response: { docs: [] } });
  } });
  await client.check("nyt", "secret");
  const movies = Array.from({ length: 6 }, (_, id) => ({ ...movie, id, imdbId: `tt000000${id}` }));
  const result = await client.enrich(movies, { nyt: "secret" });
  assert.equal(starts.length, 5);
  assert.ok(starts.slice(1).every((at, i) => at - starts[i] >= 1050));
  assert.equal(result.movies.length, 6);
  assert.equal(result.coverage.nyt.failed, 2);
  time += 60_000;
  await client.enrich(movies.slice(4), { nyt: "secret" });
  assert.equal(starts.length, 7);
});

test("une réponse NYT 429 suspend les appels suivants et respecte Retry-After", async () => {
  let time = 100_000;
  let calls = 0;
  const client = createExternalSourceClient({ now: () => time, sleep: async (ms) => { time += ms; }, fetchImpl: async () => {
    calls += 1;
    return { ...response({}, 429), headers: { get: () => "120" } };
  } });
  const movies = [movie, { ...movie, imdbId: "tt0000002" }];
  const result = await client.enrich(movies, { nyt: "secret" });
  assert.equal(result.coverage.nyt.failed, 2);
  assert.equal(calls, 1);
  time += 61_000;
  await client.enrich(movies, { nyt: "secret" });
  assert.equal(calls, 1);
  time += 60_000;
  await client.enrich([movie], { nyt: "secret" });
  assert.equal(calls, 2);
});

test("rapproche un titre original sans accepter un article générique", () => {
  assert.equal(titleMatches(movie, "Anatomy of a Fall review – riveting courtroom drama"), true);
  assert.equal(titleMatches(movie, "The best courtroom films of the decade"), false);
});

test("refuse un homonyme hors contexte cinéma", async () => {
  const delicatessen = { title: "Delicatessen", originalTitle: "Delicatessen", releaseDate: "1991-04-17" };
  const review = await nytReview(delicatessen, "nyt-key", {
    root: "https://nyt.test/articlesearch.json",
    fetchImpl: async () => response({ status: "OK", response: { docs: [{
      headline: { main: "A Wedding Celebration at Katz’s Delicatessen" },
      abstract: "A New York restaurant hosts a celebration.",
      section_name: "Style",
      type_of_material: "News",
      pub_date: "2024-06-01T00:00:00Z",
      web_url: "https://www.nytimes.com/2024/06/01/style/delicatessen-wedding.html"
    }] } })
  });
  assert.equal(review, null);
});

test("refuse la critique d’un homonyme sorti à une autre époque", async () => {
  const godzilla1954 = { title: "Godzilla", originalTitle: "Gojira", releaseDate: "1954-11-03" };
  const review = await nytReview(godzilla1954, "nyt-key", {
    root: "https://nyt.test/articlesearch.json",
    fetchImpl: async () => response({ status: "OK", response: { docs: [{
      headline: { main: "‘Godzilla’ Review: The Monster Returns" },
      abstract: "A contemporary franchise installment.",
      section_name: "Movies",
      type_of_material: "Review",
      pub_date: "2014-05-15T00:00:00Z",
      web_url: "https://www.nytimes.com/2014/05/15/movies/godzilla-review.html"
    }] } })
  });
  assert.equal(review, null);
});

test("normalise une critique Guardian sourcée", async () => {
  const review = await guardianReview(movie, "guardian-key", {
    root: "https://guardian.test/search",
    fetchImpl: async (url) => {
      assert.equal(url.searchParams.get("tag"), "film/film,tone/reviews");
      assert.equal(url.searchParams.get("api-key"), "guardian-key");
      return response({ response: { status: "ok", results: [{
        webTitle: "Anatomy of a Fall review – gripping",
        webUrl: "https://www.theguardian.com/film/example",
        webPublicationDate: "2023-10-01T00:00:00Z",
        fields: { starRating: "5", headline: "<b>Anatomy of a Fall</b> review", trailText: "A &amp; B", byline: "Peter Bradshaw" }
      }] } });
    }
  });
  assert.equal(review.rating, "5/5");
  assert.equal(review.headline, "Anatomy of a Fall review");
  assert.equal(review.summary, "A & B");
});

test("normalise une critique NYT et refuse une URL étrangère", async () => {
  const review = await nytReview(movie, "nyt-key", {
    root: "https://nyt.test/articlesearch.json",
    fetchImpl: async (url) => {
      assert.match(url.searchParams.get("fq"), /type_of_material/);
      return response({ status: "OK", response: { docs: [{
        headline: { main: "‘Anatomy of a Fall’ Review: Ambiguity" },
        abstract: "A precise review.",
        web_url: "https://malicious.example/review",
        pub_date: "2023-10-12T00:00:00Z",
        byline: { original: "By Manohla Dargis" }
      }] } });
    }
  });
  assert.equal(review.label, "The New York Times");
  assert.equal(review.url, null);
  assert.equal(review.match.certainty, "exact");
});

test("récupère les notes OMDb par identifiant IMDb", async () => {
  const reception = await omdbReception(movie, "omdb-key", {
    root: "https://omdb.test/",
    fetchImpl: async (url) => {
      assert.equal(url.searchParams.get("i"), movie.imdbId);
      return response({ Response: "True", Title: "Anatomy of a Fall", imdbID: movie.imdbId, Ratings: [
        { Source: "Internet Movie Database", Value: "7.6/10" },
        { Source: "Rotten Tomatoes", Value: "96%" }
      ], Awards: "Won 1 Oscar." });
    }
  });
  assert.equal(reception.ratings.length, 2);
  assert.match(reception.url, /tt17009710/);
});
