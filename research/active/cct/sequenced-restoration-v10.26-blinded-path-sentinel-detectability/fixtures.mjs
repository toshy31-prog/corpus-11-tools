import { fullSetup as parentSetup } from "../sequenced-restoration-v10.25-dual-channel-path-inventory-reconciliation/fixtures.mjs";

export function sentinelTrial(channels) {
  const sentinels = ["sentinel-hidden-route-a", "sentinel-hidden-route-b"];
  return {
    injectorRootId: "synthetic-independent-sentinel-injector",
    injectedAt: "2026-01-02T00:10:00.000Z",
    revealedAt: "2026-01-02T00:29:00.000Z",
    sentinels,
    channelDetections: channels.map((channel) => ({ channel, detectedPaths: [...sentinels] })),
  };
}

export function fullSetup(overrides = {}) {
  const setup = parentSetup();
  return { ...setup, blindedPathSentinelTrial: sentinelTrial(setup.executionPathDiscoveryReports.map((item) => item.channel)), ...overrides };
}
