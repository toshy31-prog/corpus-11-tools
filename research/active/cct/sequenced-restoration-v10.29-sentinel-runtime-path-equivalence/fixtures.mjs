import { fullSetup as parentSetup } from "../sequenced-restoration-v10.28-sentinel-class-construct-validation/fixtures.mjs";

export function matchedRuntimePaths(descriptors) {
  return descriptors.map((item) => ({
    sentinelId: item.sentinelId,
    runtimePathId: `synthetic-runtime-${item.sentinelId}`,
    entryCount: item.entryCount,
    aliasResolutionDepth: item.aliasResolutionDepth,
    activationDelayMs: item.activationDelayMs,
    requiredPrivilege: item.requiredPrivilege,
    blocked: true,
    blockTraceHash: `sha256:runtime-block-${item.sentinelId}`,
  }));
}

export function fullSetup(overrides = {}) {
  const setup = parentSetup();
  return { ...setup, matchedRuntimePathDescriptors: matchedRuntimePaths(setup.sentinelExecutionDescriptors), ...overrides };
}
