import { createHash } from "node:crypto";
import { canonicalStringify, clone } from "../../core/reproducibility.mjs";

export function scenarioPayload(document) {
  const payload = clone(document);
  delete payload.freeze;
  return payload;
}

export function computeScenarioHash(document) {
  return `sha256:${createHash("sha256").update(canonicalStringify(scenarioPayload(document))).digest("hex")}`;
}

export function verifyScenarioFreeze(document) {
  if (document?.freeze?.algorithm !== "sha256") throw new Error("scenario freeze algorithm must be sha256");
  const expected = computeScenarioHash(document);
  if (document.freeze.contentHash !== expected) {
    throw new Error(`scenario freeze mismatch: expected ${expected}`);
  }
  return expected;
}
