import test from "node:test";
import assert from "node:assert/strict";
import { normalizePlatformQuery, validateBandcampImport } from "./bandcamp-tools.mjs";

const release = { sourceUrl: "https://artist.bandcamp.com/album/release", artist: "An artist", title: "A release", tracks: [{ title: "A track" }], releaseDate: "2024-02-29", label: "A label" };

test("Bandcamp import keeps supplied provenance and explicit track artists", () => {
  const result = validateBandcampImport(release);
  assert.equal(result.sourceUrl, release.sourceUrl);
  assert.equal(result.tracks[0].artist, "An artist");
  assert.equal(validateBandcampImport({ ...release, tracks: [{ title: "Duet", artist: "Guest" }] }).tracks[0].artist, "Guest");
  assert.equal(validateBandcampImport({ ...release, script: "untrusted", releaseDate: "2027" }).script, undefined);
});

test("Bandcamp import rejects forged hosts, credentials, malformed tracks and impossible dates", () => {
  for (const sourceUrl of ["https://bandcamp.com.example.org/album/release", "javascript:alert(1)", "http://artist.bandcamp.com/a", "https://secret@artist.bandcamp.com/a"]) {
    assert.throws(() => validateBandcampImport({ ...release, sourceUrl }));
  }
  assert.throws(() => validateBandcampImport({ ...release, releaseDate: "2026-02-30" }));
  assert.throws(() => validateBandcampImport({ ...release, tracks: [null] }));
  assert.throws(() => validateBandcampImport({ ...release, tracks: [{ title: " " }] }));
  assert.throws(() => validateBandcampImport({ ...release, artist: "" }));
});

test("Platform query accepts common ISRC separators but requires an exact code and territory", () => {
  assert.deepEqual(normalizePlatformQuery("FR-ABC-26-00001", "fr"), { isrc: "FRABC2600001", territory: "FR" });
  assert.throws(() => normalizePlatformQuery("Artist title", "FR"));
  assert.throws(() => normalizePlatformQuery("FRABC2600001", "France"));
});
