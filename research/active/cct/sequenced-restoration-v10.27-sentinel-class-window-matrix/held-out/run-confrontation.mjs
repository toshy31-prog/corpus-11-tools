import assert from "node:assert/strict";
import { assessSentinelClassWindowMatrix } from "../runtime.mjs";
import { fullSetup } from "../fixtures.mjs";

const setup = fullSetup();
setup.sentinelClassWindowMatrix.channelResults.find((item) => item.channel === "configuration_graph" && item.sentinelId === "sentinel-delayed_activation-steady_state").detected = false;
const result = assessSentinelClassWindowMatrix(setup);
assert.deepEqual(result.failures, ["sentinel_class_window_cell_failed"]);
assert.equal(result.cellAudits.filter((cell) => !cell.detected)[0].sentinelId, "sentinel-delayed_activation-steady_state");
console.log(JSON.stringify({ ok: true, failure: result.failures[0], failedCell: "delayed_activation×steady_state" }));
