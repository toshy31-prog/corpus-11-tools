import { fullSetup as parentSetup } from "../sequenced-restoration-v10.27-sentinel-class-window-matrix/fixtures.mjs";

const offsets = { startup: 50, steady_state: 1500, rotation: 3500 };

export function descriptors(cells) {
  return cells.map((cell) => ({
    sentinelId: cell.sentinelId,
    observedOffsetMs: offsets[cell.window],
    entryCount: cell.pathClass === "direct" ? 1 : 2,
    aliasResolutionDepth: cell.pathClass === "alias" ? 2 : 0,
    activationDelayMs: cell.pathClass === "delayed_activation" ? 250 : 0,
    activationTraceHash: cell.pathClass === "delayed_activation" ? `sha256:activation-${cell.sentinelId}` : null,
    requiredPrivilege: cell.pathClass === "privileged" ? "synthetic-admin" : "none",
    authorizationTraceHash: cell.pathClass === "privileged" ? `sha256:authorization-${cell.sentinelId}` : null,
  }));
}

export function fullSetup(overrides = {}) {
  const setup = parentSetup();
  return { ...setup, sentinelExecutionDescriptors: descriptors(setup.sentinelClassWindowMatrix.cells), ...overrides };
}
