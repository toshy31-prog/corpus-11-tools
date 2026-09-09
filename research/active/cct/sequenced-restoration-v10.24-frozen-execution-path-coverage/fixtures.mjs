import { createHash } from "node:crypto";
import { fullSetup as parentSetup } from "../sequenced-restoration-v10.23-suspension-command-effect-chain/fixtures.mjs";

const paths = ["api", "batch", "emergency", "replay"];
const hash = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;

export function pathInventory() {
  return { paths: [...paths], frozenAt: "2026-01-02T00:30:00.000Z", inventoryHash: hash(JSON.stringify(paths)) };
}

export function pathProbes() {
  return paths.map((path, index) => ({ path, attemptedAt: `2026-01-02T01:1${index}:00.000Z`, blocked: true, blockTraceHash: `sha256:blocked-${path}`, observerId: `synthetic-path-observer-${index + 1}`, observedTraceHash: `sha256:blocked-${path}` }));
}

export function fullSetup(overrides = {}) {
  return { ...parentSetup(), executionPathInventory: pathInventory(), executionPathProbes: pathProbes(), ...overrides };
}
