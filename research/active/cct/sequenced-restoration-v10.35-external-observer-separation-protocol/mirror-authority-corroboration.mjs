import { createHash, createPublicKey, verify } from "node:crypto";

const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const keyDigest = key => {
  const publicKey = key?.type === "public" ? key : createPublicKey(key);
  return digest(publicKey.export({ type: "spki", format: "der" }));
};
const credentialBody = value => ({ schema: value.schema, issuerId: value.issuerId, observerId: value.observerId, observerKeyDigest: value.observerKeyDigest, controllerId: value.controllerId, failureDomain: value.failureDomain, validFromMs: value.validFromMs, validUntilMs: value.validUntilMs });
const statusBody = value => ({ schema: value.schema, issuerId: value.issuerId, generation: value.generation, generatedAtMs: value.generatedAtMs, validUntilMs: value.validUntilMs, revokedCredentialDigests: value.revokedCredentialDigests });

export const verifyMirrorAuthorityCorroboration = (bundle, mirror, mirrorKey, evaluatedAtMs) => {
  if (bundle?.schema !== "cct-mirror-authority-corroboration/v1" || !Array.isArray(bundle.authorities) || bundle.authorities.length !== 2) return false;
  const authorities = bundle.authorities;
  const exactTarget = bundle.mirrorId === mirror.mirrorId && bundle.mirrorKeyDigest === keyDigest(mirrorKey) && bundle.controllerId === mirror.controllerId && bundle.failureDomain === mirror.failureDomain;
  const distinct = authorities[0].credential.issuerId !== authorities[1].credential.issuerId && keyDigest(authorities[0].issuerPublicKeyPem) !== keyDigest(authorities[1].issuerPublicKeyPem);
  return exactTarget && distinct && authorities.every(({ credential, status, issuerPublicKeyPem }) => {
    const issuerKey = createPublicKey(issuerPublicKeyPem);
    return credential.schema === "cct-observer-authority-credential/v1" && credential.observerId === mirror.mirrorId && credential.observerKeyDigest === keyDigest(mirrorKey) &&
      credential.controllerId === mirror.controllerId && credential.failureDomain === mirror.failureDomain && evaluatedAtMs >= credential.validFromMs && evaluatedAtMs <= credential.validUntilMs &&
      verify(null, Buffer.from(JSON.stringify(credentialBody(credential))), issuerKey, Buffer.from(credential.signatureBase64 ?? "", "base64")) &&
      status.schema === "cct-observer-authority-status/v1" && status.issuerId === credential.issuerId && evaluatedAtMs >= status.generatedAtMs && evaluatedAtMs <= status.validUntilMs &&
      !status.revokedCredentialDigests.includes(digest(JSON.stringify(credential))) && verify(null, Buffer.from(JSON.stringify(statusBody(status))), issuerKey, Buffer.from(status.signatureBase64 ?? "", "base64"));
  });
};
