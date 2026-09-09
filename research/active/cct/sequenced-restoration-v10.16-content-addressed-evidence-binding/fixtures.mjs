import { createHash } from "node:crypto";
import { admissibleRegister } from "../sequenced-restoration-v10.14-prospective-effect-envelope-admission/fixtures.mjs";
import { fullSetup as parentSetup } from "../sequenced-restoration-v10.15-evidence-root-transport/fixtures.mjs";

const hash = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;

export function evidenceContents() {
  return Object.fromEntries(admissibleRegister().map((entry, index) => [entry.sourceId, {
    rawData: `synthetic raw observations ${index + 1}`,
    samplingFrame: `synthetic sampling frame ${index + 1}`,
    generator: `synthetic generator specification ${index + 1}`,
    protocol: "cct sentinel protocol v10.15",
    outcome: "pairwise hamming distance v1",
  }]));
}

export function boundManifest(contents = evidenceContents()) {
  return admissibleRegister().map((entry) => {
    const item = contents[entry.sourceId];
    const hashes = Object.fromEntries(Object.entries(item).map(([key, value]) => [key, hash(value)]));
    return {
      sourceId: entry.sourceId,
      rawDataRootHash: hashes.rawData,
      samplingFrameHash: hashes.samplingFrame,
      generatorHash: hashes.generator,
      protocolHash: "sha256:cct-sentinel-protocol-v10.15",
      outcomeHash: "sha256:pairwise-hamming-distance-v1",
      artifactHash: hash(JSON.stringify(item)),
      contentHashes: hashes,
    };
  });
}

export function fullSetup(overrides = {}) {
  const contents = evidenceContents();
  return {
    ...parentSetup({ evidenceRootManifest: boundManifest(contents) }),
    evidenceArtifactContents: contents,
    ...overrides,
  };
}
