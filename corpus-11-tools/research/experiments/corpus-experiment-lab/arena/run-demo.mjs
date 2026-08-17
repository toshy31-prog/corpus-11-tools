import { thermalMosaicContenders, thermalMosaicScenario } from "./fixtures/thermal-mosaic.mjs";
import { runBlindArena } from "./runner.mjs";

const result = runBlindArena({
  arenaId: "open-arena-demo-001",
  scenario: thermalMosaicScenario,
  contenders: thermalMosaicContenders,
  seed: 17,
  blindKey: "demo-secret-not-published",
});

process.stdout.write(`${JSON.stringify(result.report, null, 2)}\n`);
