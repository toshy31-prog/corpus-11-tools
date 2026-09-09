import test from "node:test";
import assert from "node:assert/strict";
import { assessSentinelClassWindowMatrix } from "./runtime.mjs";
import { fullSetup } from "./fixtures.mjs";

test("requires every class-window cell on both discovery channels", () => {
  const result = assessSentinelClassWindowMatrix(fullSetup());
  assert.equal(result.status, "sentinel_class_window_matrix_candidate");
  assert.equal(result.testedCells, 24);
  assert.equal(result.allDeclaredCellsDetected, true);
  assert.equal(result.unmodeledDetectabilityEstablished, false);
});

test("a missed privileged rotation path cannot hide behind aggregate success", () => {
  const setup = fullSetup();
  const cell = setup.sentinelClassWindowMatrix.channelResults.find((item) => item.channel === "runtime_discovery" && item.sentinelId === "sentinel-privileged-rotation");
  cell.detected = false;
  const result = assessSentinelClassWindowMatrix(setup);
  assert.deepEqual(result.failures, ["sentinel_class_window_cell_failed"]);
});

test("removing a declared class invalidates the frozen matrix", () => {
  const setup = fullSetup();
  setup.sentinelClassWindowMatrix.cells = setup.sentinelClassWindowMatrix.cells.filter((cell) => cell.pathClass !== "alias");
  const result = assessSentinelClassWindowMatrix(setup);
  assert.ok(result.failures.includes("sentinel_matrix_not_precommitted_or_complete"));
});
