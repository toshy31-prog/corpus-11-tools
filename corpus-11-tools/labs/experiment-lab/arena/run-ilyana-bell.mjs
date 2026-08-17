import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createDeclarativeScenario } from "./declarative/adapter.mjs";
import { ilyanaBellContenders } from "./fixtures/ilyana-bell-contenders.mjs";
import { runBlindArena } from "./runner.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const document = JSON.parse(await readFile(resolve(here, "fixtures/ilyana-bell.json"), "utf8"));
const scenario = createDeclarativeScenario(document);
const result = runBlindArena({
  arenaId: "ilyana-bell-001",
  scenario,
  contenders: ilyanaBellContenders,
  seed: 1,
  blindKey: "ilyana-fiction-secret",
});
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
