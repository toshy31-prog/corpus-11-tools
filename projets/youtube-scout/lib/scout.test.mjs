import test from "node:test";
import assert from "node:assert/strict";
import {
  PROGRAM_ROLES,
  artistCollaborationProfile,
  buildCollaborationIndex,
  composeProgramme,
  extractCreditArtists,
  extractCreditRelations,
  extractPlaylistId,
  guessArtist,
  normalizeFilters,
  parseIsoDuration,
  rankVideos
} from "./scout.mjs";

test("convertit les durées ISO YouTube", () => {
  assert.equal(parseIsoDuration("PT1H2M3S"), 3723);
  assert.equal(parseIsoDuration("PT14M"), 840);
  assert.equal(parseIsoDuration("invalide"), 0);
});

test("extrait un identifiant depuis une URL ou une valeur brute", () => {
  assert.equal(extractPlaylistId("https://www.youtube.com/playlist?list=PL1234567890abc"), "PL1234567890abc");
  assert.equal(extractPlaylistId("PL1234567890abc"), "PL1234567890abc");
  assert.equal(extractPlaylistId("https://youtube.com/watch?v=abc"), null);
});

test("détecte prudemment un artiste dans une vidéo musicale", () => {
  assert.deepEqual(
    guessArtist({ title: "Blue Train", channelTitle: "John Coltrane - Topic", categoryId: "10" }),
    { name: "John Coltrane", confidence: 0.96, basis: "chaîne Topic", source: "youtube_channel" }
  );
  assert.deepEqual(
    guessArtist({ title: "Björk - Jóga (Official Video)", channelTitle: "One Little Independent", categoryId: "10" }),
    { name: "Björk", confidence: 0.72, basis: "syntaxe de titre non corroborée" }
  );
  assert.equal(guessArtist({ title: "Architecture - notions", channelTitle: "Cours", categoryId: "27" }), null);
});

test("extrait les artistes crédités sans répéter l’artiste principal", () => {
  assert.deepEqual(
    extractCreditArtists({ title: "Björk feat. Rosalía - Oral", channelTitle: "Björk - Topic", categoryId: "10" }),
    ["Rosalía"]
  );
  assert.deepEqual(
    extractCreditArtists({ title: "DOT Allison - Substance (Felix da Housecat Remix)", channelTitle: "DOT Allison - Topic", categoryId: "10" }),
    ["Felix da Housecat"]
  );
  assert.deepEqual(
    extractCreditArtists({ title: "Sascha Funke - Mango (Original Mix)", channelTitle: "Label", categoryId: "10" }),
    []
  );
  assert.deepEqual(
    extractCreditRelations({ title: "Björk feat. Rosalía - Oral (Olof Dreijer Remix)", channelTitle: "Björk - Topic", categoryId: "10" }),
    [
      { artist: "Rosalía", kind: "featuring" },
      { artist: "Olof Dreijer", kind: "remix" }
    ]
  );
});

test("construit un indice de collaborations traçable par vidéo", () => {
  const videos = [
    { id: "oral", title: "Björk feat. Rosalía - Oral", channelTitle: "Björk - Topic", categoryId: "10" },
    { id: "oral-live", title: "Björk ft Rosalía - Oral live", channelTitle: "Björk - Topic", categoryId: "10" },
    { id: "remix", title: "Björk - Atopos (sideproject Remix)", channelTitle: "Björk - Topic", categoryId: "10" },
    { id: "talk", title: "Björk interview", channelTitle: "Archive", categoryId: "22" }
  ];
  const index = buildCollaborationIndex(videos, { remix: "Björk" });
  assert.equal(index.length, 2);
  assert.equal(index[0].count, 2);
  assert.deepEqual(index[0].artists, ["Björk", "Rosalía"]);
  assert.deepEqual(index[0].kinds, { featuring: 2, remix: 0 });
  assert.deepEqual(index[0].videoIds, ["oral", "oral-live"]);

  const profile = artistCollaborationProfile(index, "bjork");
  assert.equal(profile.partnerCount, 2);
  assert.equal(profile.occurrenceCount, 3);
  assert.equal(profile.videoCount, 3);
  assert.equal(profile.connections[0].partner, "Rosalía");
});

test("les uploads répétés ne gonflent pas les collaborations et les partenaires de second degré sont traçables", () => {
 const index = buildCollaborationIndex([
  {id:"x",title:"Alpha feat. Beta - Track",categoryId:"10"},
  {id:"xx",title:"Alpha feat. Beta - Track (Official Audio)",categoryId:"10"},
  {id:"y",title:"Beta feat. Gamma - Other",categoryId:"10"}
 ]);
 const profile = artistCollaborationProfile(index,"Alpha");
 assert.equal(profile.connections[0].count,1);
 assert.equal(profile.connections[0].videoIds.length,2);
 assert.equal(profile.secondDegree[0].partner,"Gamma");
 assert.equal(profile.secondDegree[0].via,"Beta");
});

test("normalise les playlists, lentilles et vidéos vues", () => {
  const filters = normalizeFilters({
    maxDuration: 9999,
    playlistIds: ["PL1", "PL1"],
    seen: ["a", "a", 2],
    lenses: ["deep-cut", "inconnue"]
  });
  assert.equal(filters.maxDuration, 1440);
  assert.deepEqual(filters.playlistIds, ["PL1"]);
  assert.deepEqual(filters.seen, ["a"]);
  assert.deepEqual(filters.lenses, ["deep-cut"]);
  assert.equal(filters.temperature, 55);
  assert.equal(normalizeFilters({ temperature: 900 }).temperature, 100);
});

test("pénalise les vidéos déjà beaucoup proposées", () => {
  const videos = [
    { id: "a", title: "Alpha", channelTitle: "A", durationSeconds: 60, playlistIds: [] },
    { id: "b", title: "Beta", channelTitle: "B", durationSeconds: 60, playlistIds: [] }
  ];
  const ranked = rankVideos(videos, { temperature: 0 }, { exposureCounts: { a: 10 } });
  assert.equal(ranked[0].id, "b");
});

test("le mode connexions privilégie les crédits explicites", () => {
  const videos = [
    { id: "solo", title: "Artist - Solo", channelTitle: "Artist - Topic", categoryId: "10", durationSeconds: 240, playlistIds: ["PL1"] },
    { id: "bridge", title: "Artist feat. Guest - Bridge", channelTitle: "Artist - Topic", categoryId: "10", durationSeconds: 240, playlistIds: ["PL1", "PL2"] }
  ];
  const ranked = rankVideos(videos, { lenses: ["network", "crossroads"], temperature: 0 });
  assert.equal(ranked[0].id, "bridge");
  assert.ok(ranked[0].why.includes("Connexions créditées"));
});

test("les quatre modes produisent des classements réellement distincts", () => {
  const videos = [
    { id: "fresh", title: "Fresh - New", channelTitle: "Fresh - Topic", categoryId: "10", publishedAt: "2026-09-09", addedAt: "2026-09-09", viewCount: 100000, durationSeconds: 240, playlistIds: ["A"] },
    { id: "network", title: "Bridge feat. Guest - Link", channelTitle: "Bridge - Topic", categoryId: "10", publishedAt: "2021-01-01", addedAt: "2021-01-01", viewCount: 10000, durationSeconds: 240, playlistIds: ["A", "B"] },
    { id: "archive", title: "Old - Gem", channelTitle: "Old - Topic", categoryId: "10", publishedAt: "2000-01-01", addedAt: "2010-01-01", viewCount: 2, durationSeconds: 240, position: 900, playlistIds: ["A"] },
    { id: "rare5", title: "Rare - Track", channelTitle: "RareChannel", categoryId: "10", publishedAt: "2019-01-01", addedAt: "2020-01-01", viewCount: 500, durationSeconds: 240, playlistIds: ["C"] },
    { id: "common", title: "Common - Track", channelTitle: "Fresh - Topic", categoryId: "10", publishedAt: "2020-01-01", addedAt: "2020-01-01", viewCount: 400, durationSeconds: 240, playlistIds: ["A"] }
  ];
  const modes = {
    fresh: { lenses: ["fresh"], temperature: 0 },
    network: { lenses: ["network", "crossroads"], temperature: 20 },
    archive: { lenses: ["forgotten", "deep-cut"], temperature: 15 },
    surprise: { lenses: ["off-center", "wildcard"], temperature: 100 }
  };
  const rankings = Object.values(modes).map((filters) => rankVideos(videos, filters, { rerollKey: "fixed-protocol" }).map(({ id }) => id).join(","));
  assert.equal(new Set(rankings).size, 4);
  assert.equal(rankVideos(videos, modes.fresh, { rerollKey: "fixed-protocol" })[0].id, "fresh");
  assert.equal(rankVideos(videos, modes.network, { rerollKey: "fixed-protocol" })[0].id, "network");
  assert.equal(rankVideos(videos, modes.archive, { rerollKey: "fixed-protocol" })[0].id, "archive");
});

test("classe selon l’envie et respecte les contraintes", () => {
  const videos = [
    { id: "a", title: "Architecture brutaliste", description: "", channelTitle: "Atlas", durationSeconds: 600, playlistIds: ["PL1"] },
    { id: "b", title: "Recette de soupe", description: "", channelTitle: "Cuisine", durationSeconds: 300, playlistIds: ["PL1"] },
    { id: "c", title: "Brutalisme en trois heures", description: "architecture", channelTitle: "Atlas", durationSeconds: 10800, playlistIds: ["PL1"] }
  ];
  const ranked = rankVideos(videos, { maxDuration: 30, playlistIds: ["PL1"], lenses: ["off-center"] });
  assert.deepEqual(ranked.map(({ id }) => id), ["a", "b"]);
  assert.equal("score" in ranked[0], false);
});

test("compose quatre positions sans doublon", () => {
  const videos = [
    { id: "a", channelId: "A", durationSeconds: 600, publishedAt: "2025-01-01", playlistIds: ["PL1"] },
    { id: "b", channelId: "A", durationSeconds: 700, publishedAt: "2024-01-01", playlistIds: ["PL1"] },
    { id: "c", channelId: "B", durationSeconds: 3600, publishedAt: "2010-01-01", playlistIds: ["PL2"], why: ["Deep cut"] },
    { id: "d", channelId: "C", durationSeconds: 120, publishedAt: "1998-01-01", playlistIds: ["PL3"] },
    { id: "e", channelId: "D", durationSeconds: 1600, publishedAt: "2019-01-01", playlistIds: ["PL1", "PL2"] }
  ];
  const programme = composeProgramme(videos);
  assert.equal(programme.length, 4);
  assert.equal(programme[0].id, "a");
  assert.deepEqual(programme.map(({ role }) => role.id), PROGRAM_ROLES.map(({ id }) => id));
  assert.equal(new Set(programme.map(({ id }) => id)).size, 4);
  assert.equal("sourceIndex" in programme[0], false);
});

test("compose un programme partiel", () => {
  assert.deepEqual(composeProgramme([{ id: "a" }]).map(({ role }) => role.id), ["entry"]);
});
