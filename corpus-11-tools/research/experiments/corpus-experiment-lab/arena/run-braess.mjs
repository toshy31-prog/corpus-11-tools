import { braessNetworkContenders, braessNetworkScenario } from "./fixtures/braess-network.mjs";
import { runBlindArena } from "./runner.mjs";

const result = runBlindArena({
  arenaId: "braess-mixed-adaptation-001",
  scenario: braessNetworkScenario,
  contenders: braessNetworkContenders,
  seed: 1968,
  blindKey: "braess-review-secret",
});

process.stdout.write(`${JSON.stringify(result.report, null, 2)}\n`);
