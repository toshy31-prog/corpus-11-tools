import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const app=readFileSync(new URL("../public/app.js",import.meta.url),"utf8");

test("V2.7R6: confirmed_user ne bloque plus le bootstrap artiste",()=>{
  assert.match(app,/artistName\s*=\s*recordingArtist\s*\|\|\s*strongMetadataArtist/);
  assert.doesNotMatch(app,/artistName\s*=\s*recordingArtist\s*\|\|\s*confirmedArtistName\s*\|\|\s*strongMetadataArtist/);
});
test("V2.7R6: l'ancienne confirmation reste une hint mais pas un fallback de routage",()=>{
  assert.match(app,/addHint\(confirmedArtistName\)/);
  assert.match(app,/V2\.7R6 — DISPUTED IDENTITY GATE/);
});
