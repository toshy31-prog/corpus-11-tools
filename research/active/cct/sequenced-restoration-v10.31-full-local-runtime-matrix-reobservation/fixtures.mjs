import { fullSetup as parentSetup } from "../sequenced-restoration-v10.30-local-runtime-capture-reobservation/fixtures.mjs";

export function fullSetup(overrides = {}) {
  const setup = parentSetup();
  const byId = new Map(setup.sentinelExecutionDescriptors.map((item) => [item.sentinelId, item]));
  const expectedFullLocalMatrix = setup.sentinelClassWindowMatrix.cells.map((cell) => {
    const item = byId.get(cell.sentinelId);
    return { sentinelId: cell.sentinelId, observedOffsetMs: item.observedOffsetMs, entryCount: item.entryCount, aliasResolutionDepth: item.aliasResolutionDepth, activationDelayMs: item.activationDelayMs, requiredPrivilege: item.requiredPrivilege, blocked: true };
  });
  return { ...setup, expectedFullLocalMatrix, ...overrides };
}
