import test from "node:test";
import assert from "node:assert/strict";
import { guardianReview, nytReview, omdbReception, titleMatches } from "./external-sources.mjs";

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
