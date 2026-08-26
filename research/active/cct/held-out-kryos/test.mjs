import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { validateRichDocument } from "../sequenced-recovery/rich-arena-v2/interpreter.mjs";

test("Kryos remains frozen and is refused before contender execution", () => {
  const run = spawnSync(process.execPath, [new URL("./review-kryos.mjs", import.meta.url).pathname, "--check"], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  assert.equal(run.stderr, "");
});

test("the re-emission prompt is self-contained and contender-blind", async () => {
  const prompt = await readFile(new URL("./reemission-prompt.txt", import.meta.url), "utf8");
  const source = await readFile(new URL("./kryos-bridges-v1.raw.json", import.meta.url), "utf8");
  assert.ok(prompt.includes(source.trimEnd()));
  assert.doesNotMatch(prompt, /\bCCT(?:-EXEC)?\b/i);
  assert.match(prompt, /Tu n’as accès à rien d’autre qu’à ce prompt/);
  assert.match(prompt, /Aucun score global/);
  assert.match(prompt, /graine entière/);
  assert.match(prompt, /draw < 0\.7/);
  assert.match(prompt, /n’inclus pas de champ `freeze`/i);
});

test("Kryos 1.1.0 is frozen and rejected before execution for material reasons", async () => {
  const bytes = await readFile(new URL("./kryos-bridges-v1.1.0.received.json", import.meta.url));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), "7583e50bb4fef99048cdda42c9fab9f13566870f3600b01697d24bfa08ca68c0");
  assert.equal(createHash("sha256").update(bytes.subarray(0, -1)).digest("hex"), "8657af9f65f70e8668722d73391acff5c9003ee1bd2cd5cb8f4b54d71745925a");
  const document = JSON.parse(bytes);
  const validation = validateRichDocument(document);
  assert.equal(validation.valid, false);
  assert.equal(validation.errors.length, 10);
  const expected = [0.9797282677609473, 0.3067522644996643, 0.484205421525985, 0.817934412509203, 0.5094283693470061, 0.34747186047025025, 0.07375754183158278, 0.7663964673411101];
  assert.notDeepEqual(document.source.randomness.draws, expected);
  assert.equal(Array.isArray(document.transitions.global_rules), false);
  const prompt = await readFile(new URL("./v1.1.1-correction-prompt.txt", import.meta.url), "utf8");
  assert.doesNotMatch(prompt, /\bCCT(?:-EXEC)?\b/i);
  assert.ok(prompt.includes(bytes.toString("utf8").trimEnd()));
});
