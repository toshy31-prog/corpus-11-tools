import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const app = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");

test("V2.7R5: recording not_found peut déclencher un bootstrap artiste borné", () => {
  assert.match(app, /V2\.7R5 — ARTIST BOOTSTRAP/);
  assert.match(app, /youtubeTagKeys/);
  assert.match(app, /identityDetails\(hint\)/);
  assert.match(app, /confirmed_cross_id|resolved/);
});
test("V2.7R5: le fallback ne promeut pas un segment sans corroboration", () => {
  assert.match(app, /youtubeTagKeys\.has\(hintKey\)/);
  assert.match(app, /strongIdentityStatuses\.has/);
});
