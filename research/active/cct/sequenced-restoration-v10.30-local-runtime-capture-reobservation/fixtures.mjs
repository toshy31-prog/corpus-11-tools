import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fullSetup as parentSetup } from "../sequenced-restoration-v10.29-sentinel-runtime-path-equivalence/fixtures.mjs";

const harnessUrl = new URL("./local-gate-harness.mjs", import.meta.url);
const hash = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;

export function fullSetup(overrides = {}) {
  const setup = parentSetup();
  const target = setup.matchedRuntimePathDescriptors.find((item) => item.sentinelId === "sentinel-direct-startup");
  return {
    ...setup,
    expectedLocalHarnessHash: hash(readFileSync(harnessUrl)),
    localCaptureTargetSentinelId: "sentinel-direct-startup",
    expectedLocalCapture: Object.fromEntries(["sentinelId", "entryCount", "aliasResolutionDepth", "activationDelayMs", "requiredPrivilege", "blocked"].map((field) => [field, target[field]])),
    ...overrides,
  };
}
