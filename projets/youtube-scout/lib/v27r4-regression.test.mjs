import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const app = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");

test("V2.7R4 recording-first gate", () => {
  assert.match(app, /const isRecordingSeed/);
  assert.match(app, /hasDirectStructuredIdentity/);
  assert.match(app, /hasTrustedArtistRelation/);
});
test("V2.7R6 recording artist authority excludes a disputed historical confirmation", () => {
  assert.match(app, /artistName\s*=\s*recordingArtist\s*\|\|\s*strongMetadataArtist/);
  assert.doesNotMatch(app, /recordingArtist\s*\|\|\s*confirmedArtistName/);
});
