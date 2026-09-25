import test from "node:test";
import assert from "node:assert/strict";
import { compileAvailability, rankDerivedCandidates } from "./digging.mjs";

test("classe les pistes dérivées par lien, nouveauté et diversité", () => {
  const candidates = [
    { id: "a1", artist: "A", channelTitle: "Même chaîne", viewCount: 10, paths: [{ kind: "credit" }] },
    { id: "a2", artist: "A", channelTitle: "Même chaîne", viewCount: 20, paths: [{ kind: "credit" }] },
    { id: "b1", artist: "B", channelTitle: "Autre chaîne", viewCount: 100, paths: [{ kind: "label" }] },
    { id: "c1", artist: "C", channelTitle: "Troisième chaîne", viewCount: 1000, paths: [{ kind: "artist" }] }
  ];
  const ranked = rankDerivedCandidates(candidates, { limit: 3, rerollKey: "one", recentIds: new Set(["a2"]), exposureCounts: { a2: 4 } });
  assert.equal(ranked[0].id, "a1");
  assert.ok(ranked.slice(0, 2).some(({ id }) => id === "b1"));
  assert.equal(ranked.some(({ id }) => id === "a2"), false);
});

test("un reroll exclut les pistes actuellement affichées", () => {
  const candidates = ["a", "b", "c"].map((id) => ({ id, artist: id, channelTitle: id, paths: [{ kind: "artist" }] }));
  const ranked = rankDerivedCandidates(candidates, { limit: 2, excludeIds: new Set(["a", "b"]), rerollKey: "two" });
  assert.deepEqual(ranked.map(({ id }) => id), ["c"]);
});

test("détecte un différentiel sans inventer une exclusivité", () => {
  const result = compileAvailability({
    isrc: "FRABC2500001",
    territory: "FR",
    youtubeVideoId: "yt1",
    applemusic: { status: "ok", songs: [{ attributes: { name: "Piste", artistName: "A", url: "https://music.apple.com/fr/song/1" } }] },
    spotify: { status: "ok", tracks: [] }
  });
  assert.equal(result.differential.status, "candidate");
  assert.deepEqual(result.differential.presentOn, ["youtube", "applemusic"]);
  assert.deepEqual(result.differential.notFoundOn, ["spotify"]);
  assert.equal(result.exclusivity.status, "not_established");
});

test("rend visibles les plateformes non configurées", () => {
  const result = compileAvailability({ isrc: "FRABC2500001", applemusic: { status: "not_configured" }, spotify: { status: "not_configured" } });
  assert.deepEqual(result.coverage.missing, [
    { platform: "applemusic", status: "not_configured" },
    { platform: "spotify", status: "not_configured" }
  ]);
  assert.equal(result.differential.status, "not_observed");
});
