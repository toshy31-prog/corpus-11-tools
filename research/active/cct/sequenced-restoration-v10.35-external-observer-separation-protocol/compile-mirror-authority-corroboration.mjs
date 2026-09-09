import { createPublicKey } from "node:crypto";
import { readFileSync } from "node:fs";
import { atomicReplaceDurable } from "./atomic-replace.mjs";
import { verifyMirrorAuthorityCorroboration } from "./mirror-authority-corroboration.mjs";

const [mirrorReceiptPath, mirrorPublicKeyPath, firstCredentialPath, firstIssuerPublicKeyPath, firstStatusPath, secondCredentialPath, secondIssuerPublicKeyPath, secondStatusPath, outputPath] = process.argv.slice(2);
if (!outputPath) {
  process.stderr.write("usage: node compile-mirror-authority-corroboration.mjs MIRROR_RECEIPT MIRROR_PUBLIC_KEY CREDENTIAL_1 ISSUER_PUBLIC_KEY_1 STATUS_1 CREDENTIAL_2 ISSUER_PUBLIC_KEY_2 STATUS_2 OUTPUT\n");
  process.exit(2);
}
const mirror = JSON.parse(readFileSync(mirrorReceiptPath, "utf8"));
const mirrorKey = createPublicKey(readFileSync(mirrorPublicKeyPath));
const authorities = [[firstCredentialPath, firstIssuerPublicKeyPath, firstStatusPath], [secondCredentialPath, secondIssuerPublicKeyPath, secondStatusPath]].map(([credentialPath, issuerKeyPath, statusPath]) => ({
  credential: JSON.parse(readFileSync(credentialPath, "utf8")),
  issuerPublicKeyPem: createPublicKey(readFileSync(issuerKeyPath)).export({ type: "spki", format: "pem" }).toString(),
  status: JSON.parse(readFileSync(statusPath, "utf8"))
}));
const bundle = { schema: "cct-mirror-authority-corroboration/v1", mirrorId: mirror.mirrorId, mirrorKeyDigest: authorities[0].credential.observerKeyDigest, controllerId: mirror.controllerId, failureDomain: mirror.failureDomain, authorities, compiledAtMs: Date.now() };
if (!verifyMirrorAuthorityCorroboration(bundle, mirror, mirrorKey, bundle.compiledAtMs)) throw new Error("mirror authority corroboration invalid");
atomicReplaceDurable(outputPath, `${JSON.stringify(bundle)}\n`);
