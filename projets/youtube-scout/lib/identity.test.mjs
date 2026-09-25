import test from "node:test";
import assert from "node:assert/strict";
import { artistNameMatch, buildArtistRegistryEntry, buildRecordingResolution, parseTrackCandidate, parseTrackCandidates, registryStorageKey } from "./identity.mjs";

test("une chaîne artiste permet de proposer la lecture d’un titre seul sans le confirmer", () => {
 const candidates = parseTrackCandidates("Nepal (Original Mix)", "KAS:ST");
 assert.equal(candidates[0].title, "Nepal");
 assert.equal(candidates[0].mix, "Original Mix");
 assert.equal(candidates[0].basis, "known_artist_title_only_candidate");
 assert.equal(buildRecordingResolution(candidates[0], {}).resolved, null);
});

test("construit une identité canonique sans score global", () => {
  const entry = buildArtistRegistryEntry("Björk", {
    musicBrainz: { artist: { id: "mb-1", name: "Björk", musicBrainzUrl: "https://musicbrainz.org/artist/mb-1" } },
    wikidata: { id: "Q1", name: "Björk", wikidataUrl: "https://www.wikidata.org/wiki/Q1", labels: ["One Little Independent"], musicBrainzId: "mb-1", discogsId: "1373" },
    discogs: { status: "matched", match: "exact", id: 1373, name: "Björk", discogsUrl: "https://www.discogs.com/artist/1373-Bj%C3%B6rk" }
  }, "2026-09-10T12:00:00.000Z");
  assert.equal(entry.id, "mbid:mb-1");
  assert.equal(entry.canonicalName, "Björk");
  assert.equal(entry.canonicalSource, "musicbrainz");
  assert.equal(entry.agreement.status, "multi_source");
  assert.deepEqual(entry.externalIds, { musicbrainz: "mb-1", wikidata: "Q1", discogs: "1373" });
  assert.equal("score" in entry, false);
  assert.ok(entry.claims.some(({ field, value, source }) => field === "associated_label" && value === "One Little Independent" && source === "wikidata"));
});

test("conserve les contradictions au lieu de fusionner les homonymes", () => {
  const entry = buildArtistRegistryEntry("The Bug", {
    musicBrainz: { artist: { id: "mb-kevin", name: "The Bug", musicBrainzUrl: "https://musicbrainz.org/artist/mb-kevin" } },
    wikidata: { id: "Q-wrong", name: "The Bugs", wikidataUrl: "https://www.wikidata.org/wiki/Q-wrong", labels: [] },
    discogs: { status: "candidate", match: "candidate", id: 999, name: "Bug (9)", discogsUrl: "https://www.discogs.com/artist/999-Bug-9" }
  });
  assert.equal(entry.canonicalName, "The Bug");
  assert.equal(entry.agreement.status, "conflicted");
  assert.equal(entry.conflicts.length, 2);
  assert.equal(entry.externalIds.discogs, undefined);
  assert.ok(entry.claims.some(({ source, status }) => source === "discogs" && status === "candidate"));
});

test("normalise la clé locale sans perdre le nom affiché", () => {
  assert.equal(registryStorageKey("Björk Guðmundsdóttir"), "artist:bjorkgumundsdottir");
});

test("résout un alias seulement lorsqu’une source le déclare", () => {
  assert.deepEqual(artistNameMatch("Mike Paradinas", "µ-Ziq", ["Mike Paradinas"]), { accepted: true, basis: "exact_alias" });
  assert.deepEqual(artistNameMatch("The Bug", "Bug (9)", []), { accepted: false, basis: "candidate" });
  const entry = buildArtistRegistryEntry("Mike Paradinas", {
    musicBrainz: { artist: { id: "mb-uziq", name: "µ-Ziq", aliases: ["Mike Paradinas"], musicBrainzUrl: "https://musicbrainz.org/artist/mb-uziq" } },
    wikidata: { id: "Q-uziq", name: "Mike Paradinas", musicBrainzId: "mb-uziq", discogsId: "42", wikidataUrl: "https://www.wikidata.org/wiki/Q-uziq", labels: [] },
    discogs: { id: 42, name: "µ-Ziq", aliases: ["Mike Paradinas"], discogsUrl: "https://www.discogs.com/artist/42" }
  });
  assert.equal(entry.canonicalName, "µ-Ziq");
  assert.equal(entry.resolution.status, "confirmed_cross_id");
  assert.deepEqual(entry.externalIds, { musicbrainz: "mb-uziq", wikidata: "Q-uziq", discogs: "42" });
});

test("ne fusionne Discogs sur le seul nom et accepte une confirmation explicite", () => {
  const candidate = buildArtistRegistryEntry("A", { discogs: { id: 7, name: "A", match: "exact" } });
  assert.equal(candidate.resolution.status, "unresolved");
  assert.equal(candidate.externalIds.discogs, undefined);
  const confirmed = buildArtistRegistryEntry("A", { discogs: { id: 7, name: "A", match: "user_confirmed" } });
  assert.equal(confirmed.resolution.status, "confirmed_user");
  assert.equal(confirmed.externalIds.discogs, "7");
});

test("décompose un titre sans inventer les segments éditoriaux", () => {
  assert.deepEqual(parseTrackCandidate("DOT Allison - Substance (Felix da Housecat Remix) [Official Audio]", "Dot Allison"), {
    status: "parsed",
    sourceTitle: "DOT Allison - Substance (Felix da Housecat Remix) [Official Audio]",
    artist: "Dot Allison",
    title: "Substance",
    mix: "Felix da Housecat Remix",
    discarded: []
  });
  const noisy = parseTrackCandidate("ALEX MOUTHON - ANYWHERE BUT HERE - Son de Teuf - Free Tekno", "Alex Mouthon");
  assert.equal(noisy.title, "ANYWHERE BUT HERE");
  assert.deepEqual(noisy.discarded, ["Son de Teuf", "Free Tekno"]);
});

test("essaie plusieurs lectures traçables des titres éditorialisés", () => {
  const candidates = parseTrackCandidates("PREMIERE: [DUB12] Wrong Channel - Hidden Track", "Real Artist");
  assert.ok(candidates.some(({ artist, title, basis }) => artist === "Real Artist" && title === "Hidden Track" && basis === "known_artist_anchor"));
});

test("ne résout un morceau que sur artiste et titre exacts", () => {
  const parsed = parseTrackCandidate("Dot Allison - Substance (Felix da Housecat Remix)", "Dot Allison");
  const resolution = buildRecordingResolution(parsed, { musicBrainz: [
    { id: "recording-1", title: "Substance (Felix da Housecat Remix)", sourceScore: 83, artistCredits: [{ name: "Dot Allison" }] },
    { id: "recording-2", title: "Substance", sourceScore: 88, artistCredits: [{ name: "Another Artist" }] }
  ] });
  assert.equal(resolution.status, "resolved");
  assert.equal(resolution.resolved.id, "recording-1");
  assert.equal(resolution.candidates[1].accepted, false);
});

test("refuse une durée manifestement incompatible", () => {
  const parsed = parseTrackCandidate("Dot Allison - Substance", "Dot Allison");
  const resolution = buildRecordingResolution(parsed, { durationMs: 240_000, musicBrainz: [
    { id: "recording-short", title: "Substance", sourceScore: 100, lengthMs: 60_000, artistCredits: [{ name: "Dot Allison" }] }
  ] });
  assert.equal(resolution.status, "candidates");
  assert.equal(resolution.candidates[0].durationCompatible, false);
});

test("conserve la corroboration Discogs et borne la preuve Bandcamp", () => {
  const parsed = parseTrackCandidate("Dot Allison - Substance", "Dot Allison");
  const result = buildRecordingResolution(parsed, {
    musicBrainz: [{ id: "mb-r", title: "Substance", sourceScore: 100, artistCredits: [{ name: "Dot Allison" }], lengthMs: 300_000 }],
    discogs: [{ id: 77, title: "Dot Allison - Substance", labels: ["Mantra"] }],
    bandcamp: { url: "https://dotallison.bandcamp.com/", source: "wikidata" },
    durationMs: 300_000
  });
  assert.equal(result.status, "resolved");
  assert.equal(result.discogsCandidates[0].corroborates, true);
  assert.equal(result.corroboration.discogs, "catalogue_match");
  assert.equal(result.corroboration.bandcamp, "artist_profile_only");
  assert.ok(result.evidence.some(({ source, basis }) => source === "discogs" && basis === "exact_catalogue_artist_title"));
});
