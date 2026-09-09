import { fullSetup as parentSetup } from "../sequenced-restoration-v10.24-frozen-execution-path-coverage/fixtures.mjs";

export function discoveryReports(paths) {
  return [
    { channel: "configuration_graph", scannerRootId: "synthetic-config-scanner", discoveredPaths: [...paths], observedAt: "2026-01-02T00:20:00.000Z" },
    { channel: "runtime_discovery", scannerRootId: "synthetic-runtime-scanner", discoveredPaths: [...paths], observedAt: "2026-01-02T00:25:00.000Z" },
  ];
}

export function fullSetup(overrides = {}) {
  const setup = parentSetup();
  return { ...setup, executionPathDiscoveryReports: discoveryReports(setup.executionPathInventory.paths), ...overrides };
}
