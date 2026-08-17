import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createDeclarativeScenario } from "./declarative/adapter.mjs";
import { declarativePulseContenders } from "./fixtures/declarative-pulse-contenders.mjs";
import { runBlindArena } from "./runner.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const document = JSON.parse(await readFile(resolve(here, "fixtures/declarative-pulse.json"), "utf8"));
const scenario = createDeclarativeScenario(document);
const result = runBlindArena({
  arenaId: "declarative-pulse-001",
  scenario,
  contenders: declarativePulseContenders,
  seed: 1,
  blindKey: "declarative-demo-secret",
});
process.stdout.write(`${JSON.stringify(result.report, null, 2)}\n`);
