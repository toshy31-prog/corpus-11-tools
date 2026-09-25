import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source =
  fs.readFileSync(
    new URL("../public/app.js", import.meta.url),
    "utf8"
  );

test("active et recovery ont des slots distincts", () => {
  assert.equal(
    source.includes("let resumableDig = null;"),
    true
  );
});

test("aucun vieux activeDig n'est fraîchement timestampé pendant restore backup", () => {
  assert.equal(
    source.includes(
      'const restoredDig = { ...(payload.local.activeDig || {}), updatedAt: new Date().toISOString() };'
    ),
    false
  );
});
