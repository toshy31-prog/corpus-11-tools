import { createHash, createPrivateKey, createPublicKey, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import { atomicReplaceDurable } from "./atomic-replace.mjs";

const [registryPath, authorityPrivateKeyPath, previousPath, issuedAtText, revokedJson, equivocationJson, policyEquivocationJson, appliedPolicyResolutionJson, applicationRecordsJson, outputPath] = process.argv.slice(2);
if (!outputPath) { process.stderr.write("usage: node create-source-registry-status.mjs ... APPLIED_POLICY_RESOLUTION_DIGESTS_JSON APPLICATION_RECORDS_JSON OUTPUT\n"); process.exit(2); }
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const registry = JSON.parse(readFileSync(registryPath, "utf8"));
const authorityPrivateKey = createPrivateKey(readFileSync(authorityPrivateKeyPath));
const authorityKeyDigest = digest(createPublicKey(authorityPrivateKey).export({ type: "spki", format: "der" }));
const previousText = previousPath === "-" ? null : readFileSync(previousPath, "utf8");
const previous = previousText && JSON.parse(previousText);
const revokedSourceKeyDigests = JSON.parse(revokedJson).sort();
const knownEquivocationDigests = JSON.parse(equivocationJson).sort();
const knownRecoveryPolicyEquivocationDigests = JSON.parse(policyEquivocationJson).sort();
const appliedPolicyResolutionDigests = JSON.parse(appliedPolicyResolutionJson).sort();
const policyResolutionApplicationRecords = JSON.parse(applicationRecordsJson).sort((left, right) => left.resolutionDigest.localeCompare(right.resolutionDigest));
const validList = values => Array.isArray(values) && new Set(values).size === values.length && values.every(value => /^sha256:[0-9a-f]{64}$/.test(value));
const recordsValid = Array.isArray(policyResolutionApplicationRecords) && new Set(policyResolutionApplicationRecords.map(value => value.resolutionDigest)).size === policyResolutionApplicationRecords.length && new Set(policyResolutionApplicationRecords.map(value => value.incidentSetDigest)).size === policyResolutionApplicationRecords.length;
if (authorityKeyDigest !== registry.statusAuthorityKeyDigest || !validList(revokedSourceKeyDigests) || !validList(knownEquivocationDigests) || !validList(knownRecoveryPolicyEquivocationDigests) || !validList(appliedPolicyResolutionDigests) || !recordsValid || (previous && (!previous.revokedSourceKeyDigests.every(value => revokedSourceKeyDigests.includes(value)) || !previous.knownEquivocationDigests.every(value => knownEquivocationDigests.includes(value)) || !previous.knownRecoveryPolicyEquivocationDigests.every(value => knownRecoveryPolicyEquivocationDigests.includes(value)) || !previous.appliedPolicyResolutionDigests.every(value => appliedPolicyResolutionDigests.includes(value)) || !previous.policyResolutionApplicationRecords.every(value => policyResolutionApplicationRecords.some(candidate => JSON.stringify(candidate) === JSON.stringify(value)))))) throw new Error("status inputs invalid");
const body = { schema: "cct-control-evidence-source-registry-status/v1", registryStateDigest: registry.stateDigest, generation: previous ? previous.generation + 1 : 0, issuedAtMs: Number(issuedAtText), previousStatusDigest: previousText ? digest(previousText) : null, revokedSourceKeyDigests, knownEquivocationDigests, knownRecoveryPolicyEquivocationDigests, appliedPolicyResolutionDigests, policyResolutionApplicationRecords };
if (!Number.isSafeInteger(body.issuedAtMs)) throw new Error("issuedAtMs invalid");
const value = { ...body, signatureBase64: sign(null, Buffer.from(JSON.stringify(body)), authorityPrivateKey).toString("base64") };
atomicReplaceDurable(outputPath, `${JSON.stringify(value)}\n`);
