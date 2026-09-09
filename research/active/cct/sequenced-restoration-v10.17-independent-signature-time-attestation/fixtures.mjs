import { generateKeyPairSync, sign } from "node:crypto";
import { fullSetup as parentSetup } from "../sequenced-restoration-v10.16-content-addressed-evidence-binding/fixtures.mjs";

const witnesses = ["synthetic-witness-a", "synthetic-witness-b"].map((witnessId) => ({ witnessId, ...generateKeyPairSync("ed25519") }));
const payload = (item) => JSON.stringify({ sourceId: item.sourceId, artifactHash: item.artifactHash, issuedAt: item.issuedAt, witnessId: item.witnessId });

export function signedAttestations(manifest) {
  return manifest.map((entry, index) => {
    const witness = witnesses[index % witnesses.length];
    const item = { sourceId: entry.sourceId, artifactHash: entry.artifactHash, issuedAt: "2026-01-01T12:00:00.000Z", witnessId: witness.witnessId };
    return {
      ...item,
      publicKeyPem: witness.publicKey.export({ type: "spki", format: "pem" }),
      signatureBase64: sign(null, Buffer.from(payload(item)), witness.privateKey).toString("base64"),
    };
  });
}

export function fullSetup(overrides = {}) {
  const setup = parentSetup();
  return { ...setup, timeAttestations: signedAttestations(setup.evidenceRootManifest), ...overrides };
}
