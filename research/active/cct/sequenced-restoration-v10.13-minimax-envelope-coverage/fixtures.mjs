import { fullSetup as parentSetup } from "../sequenced-restoration-v10.12-rival-effect-power-envelope/fixtures.mjs";

export function fullSetup(overrides = {}) {
  return {
    ...parentSetup(),
    availableBitsPerBatch: 32,
    requestedEnvelopeCoverage: "plan_only",
    ...overrides,
  };
}
