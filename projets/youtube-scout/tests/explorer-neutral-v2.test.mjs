import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL("../public/app.js", import.meta.url),
  "utf8"
);

test("recovery distincte", () => {
  assert.equal(source.includes("let resumableDig = null;"), true);
});

test("restore ne réactive plus restored", () => {
  const start = source.indexOf("async function restoreExplorationSession()");
  const end = source.indexOf("async function useVideoAsSeed(video)", start);
  const block = source.slice(start, end);
  assert.equal(block.includes("activeDig = { ...activeDig, ...restored };"), false);
  assert.equal(block.includes("resumableDig ="), true);
  assert.equal(block.includes("explorationSession = null;"), true);
  assert.equal(block.includes("seed: null"), true);
});

test("backup ne rafraîchit plus activeDig", () => {
  assert.equal(
    source.includes(
      'const restoredDig = { ...(payload.local.activeDig || {}), updatedAt: new Date().toISOString() };'
    ),
    false
  );
});

test("restoreBackup ne réactive plus dig", () => {
  const start = source.indexOf("async function restoreBackup(event)");
  const end = source.indexOf("async function recordFeedback(", start);
  const block = source.slice(start, end);
  assert.equal(block.includes("explorationSession = activeDig.front;"), false);
  assert.equal(
    block.includes("Explorer est prêt pour un nouveau départ."),
    true
  );
});
