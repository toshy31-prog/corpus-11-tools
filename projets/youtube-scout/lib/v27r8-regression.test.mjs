import test from "node:test";import assert from "node:assert/strict";import {readFileSync} from "node:fs";
const a=readFileSync(new URL("../public/app.js",import.meta.url),"utf8");const j=readFileSync(new URL("../public/journey-state.mjs",import.meta.url),"utf8");
test("R8 corroboration",()=>{assert.match(a,/musicbrainzExact/);assert.match(a,/discogsExact/)});
test("R8 disputed session",()=>{assert.match(a,/disputedSeedArtistIds/);assert.match(j,/disputedArtistIds/);assert.match(j,/!disputedArtistIds\.has\(edge\.to\)/)});
