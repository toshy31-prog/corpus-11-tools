export function runLocalGateAttempt() {
  const gate = { authority_quorum: false };
  return {
    sentinelId: "sentinel-direct-startup",
    runtimePathId: "local-runtime-direct-startup",
    entryCount: 1,
    aliasResolutionDepth: 0,
    activationDelayMs: 0,
    requiredPrivilege: "none",
    blocked: gate.authority_quorum === false,
    attemptedCapability: "authority_quorum",
  };
}

export function runLocalGateMatrix(gateEnabled = false) {
  const classes = ["direct", "alias", "delayed_activation", "privileged"];
  const windows = ["startup", "steady_state", "rotation"];
  const offsets = { startup: 50, steady_state: 1500, rotation: 3500 };
  return classes.flatMap((pathClass) => windows.map((window) => ({
    sentinelId: `sentinel-${pathClass}-${window}`,
    runtimePathId: `local-runtime-${pathClass}-${window}`,
    observedOffsetMs: offsets[window],
    entryCount: pathClass === "direct" ? 1 : 2,
    aliasResolutionDepth: pathClass === "alias" ? 2 : 0,
    activationDelayMs: pathClass === "delayed_activation" ? 250 : 0,
    requiredPrivilege: pathClass === "privileged" ? "synthetic-admin" : "none",
    blocked: gateEnabled === false,
    passed: gateEnabled === true,
    attemptedCapability: "authority_quorum",
  })));
}

export function runLocalGateMatrixFromConfig(config) {
  if (!config || config.schema !== "cct-local-gate-state/v1" || typeof config.authorityQuorumEnabled !== "boolean") throw new Error("invalid gate config");
  return runLocalGateMatrix(config.authorityQuorumEnabled);
}

export function createLocalGateComponent(initialEnabled = true) {
  let enabled = initialEnabled;
  let loadedConfigHash = null;
  return {
    applyConfig(config, configHash) {
      if (!config || config.schema !== "cct-local-gate-state/v1") throw new Error("invalid gate config");
      const before = enabled;
      enabled = config.authorityQuorumEnabled;
      loadedConfigHash = configHash;
      return { actorId: "synthetic-gate-component", before, after: enabled, loadedConfigHash };
    },
    attempt() {
      return { actorId: "synthetic-gate-component", loadedConfigHash, blocked: !enabled, passed: enabled, attemptedCapability: "authority_quorum" };
    },
  };
}
