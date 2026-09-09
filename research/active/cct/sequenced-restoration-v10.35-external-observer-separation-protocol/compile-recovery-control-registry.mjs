import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { atomicReplaceDurable } from "./atomic-replace.mjs";

const [inputPath, sourceRegistryPath, outputPath] = process.argv.slice(2);
if (!outputPath) {
  process.stderr.write("usage: node compile-recovery-control-registry.mjs INPUT_JSON SOURCE_REGISTRY OUTPUT\n");
  process.exit(2);
}
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const input = JSON.parse(readFileSync(inputPath, "utf8"));
const sourceRegistryText = readFileSync(sourceRegistryPath, "utf8");
const sourceRegistry = JSON.parse(sourceRegistryText);
const sourceBody = { schema: sourceRegistry.schema, statusAuthorityKeyDigest: sourceRegistry.statusAuthorityKeyDigest, sources: sourceRegistry.sources };
if (sourceRegistry.schema !== "cct-control-evidence-source-registry/v1" || sourceRegistry.stateDigest !== digest(JSON.stringify(sourceBody))) throw new Error("source registry integrity invalid");
const attestationBody = value => ({ schema: value.schema, subjectId: value.subjectId, subjectControllerId: value.subjectControllerId, subjectFailureDomain: value.subjectFailureDomain, sourceId: value.sourceId, sourceControllerId: value.sourceControllerId, sourceFailureDomain: value.sourceFailureDomain, documentDigest: value.documentDigest, upstreamDigests: value.upstreamDigests, lineageComplete: value.lineageComplete });
const profiles = input.profiles.map(profile => ({ ...profile, evidenceRoots: (profile.evidenceRoots ?? []).map(root => {
  const attestationText = readFileSync(root.attestationPath, "utf8");
  const attestation = JSON.parse(attestationText);
  const source = sourceRegistry.sources.find(value => value.sourceId === attestation.sourceId);
  const valid = source && attestation.schema === "cct-recovery-control-evidence-attestation/v1" && attestation.subjectId === profile.id &&
    attestation.subjectControllerId === profile.controllerId && attestation.subjectFailureDomain === profile.failureDomain &&
    attestation.sourceControllerId === source.controllerId && attestation.sourceFailureDomain === source.failureDomain && attestation.lineageComplete === true &&
    verify(null, Buffer.from(JSON.stringify(attestationBody(attestation))), createPublicKey(source.publicKeyPem), Buffer.from(attestation.signatureBase64 ?? "", "base64"));
  if (!valid) throw new Error("control evidence attestation invalid");
  return { ...attestation, attestationDigest: digest(attestationText) };
}) }));
if (!Array.isArray(profiles) || profiles.length !== 5) throw new Error("exactly five control profiles required");
const exactRoles = profiles.filter(value => value.role === "recovery").length === 3 && profiles.filter(value => value.role === "ratifier").length === 2;
const distinct = field => new Set(profiles.map(value => value[field])).size === profiles.length;
const roots = profiles.flatMap(value => value.evidenceRoots ?? []);
const lineageDigests = roots.flatMap(value => [value.documentDigest, ...(value.upstreamDigests ?? [])]);
const rootsValid = profiles.every(profile => Array.isArray(profile.evidenceRoots) && profile.evidenceRoots.length >= 2 &&
  new Set(profile.evidenceRoots.map(value => value.sourceId)).size === profile.evidenceRoots.length &&
  new Set(profile.evidenceRoots.map(value => value.sourceControllerId)).size === profile.evidenceRoots.length &&
  new Set(profile.evidenceRoots.map(value => value.sourceFailureDomain)).size === profile.evidenceRoots.length &&
  profile.evidenceRoots.every(value => /^sha256:[0-9a-f]{64}$/.test(value.documentDigest) && value.sourceControllerId !== profile.controllerId && value.sourceFailureDomain !== profile.failureDomain));
if (!exactRoles || !distinct("id") || !distinct("keyDigest") || !distinct("controllerId") || !distinct("failureDomain") ||
    !rootsValid || new Set(lineageDigests).size !== lineageDigests.length) throw new Error("control separation evidence invalid");
const body = { schema: "cct-recovery-control-registry/v1", sourceRegistryDigest: digest(sourceRegistryText), sourceRegistry, profiles };
atomicReplaceDurable(outputPath, `${JSON.stringify({ ...body, stateDigest: digest(JSON.stringify(body)) })}\n`);
