import { createHash } from "node:crypto";
import { fullSetup as parentSetup } from "../sequenced-restoration-v10.26-blinded-path-sentinel-detectability/fixtures.mjs";

const classes = ["direct", "alias", "delayed_activation", "privileged"];
const windows = ["startup", "steady_state", "rotation"];
const hash = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;

export function matrix(channels) {
  const cells = classes.flatMap((pathClass) => windows.map((window) => ({ pathClass, window, sentinelId: `sentinel-${pathClass}-${window}` })));
  return { cells, matrixHash: hash(JSON.stringify(cells)), frozenAt: "2026-01-01T23:00:00.000Z", channelResults: channels.flatMap((channel) => cells.map((cell) => ({ channel, sentinelId: cell.sentinelId, detected: true }))) };
}

export function fullSetup(overrides = {}) {
  const setup = parentSetup();
  return { ...setup, sentinelClassWindowMatrix: matrix(setup.executionPathDiscoveryReports.map((item) => item.channel)), ...overrides };
}
