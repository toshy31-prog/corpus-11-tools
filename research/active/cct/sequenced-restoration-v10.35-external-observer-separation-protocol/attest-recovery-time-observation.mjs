import { createHash, createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { atomicReplaceDurable } from "./atomic-replace.mjs";
import { recoveryTimeObservationBody } from "./recovery-time-evidence.mjs";
import { anchorLedgerBody, ledgerReceiptBody } from "./network-separation-history-anchor.mjs";
import { verifyPreviousStatusChainBundle } from "./previous-status-chain.mjs";
import { verifyPreviousStatusSuspensionEffect } from "./previous-status-suspension-effect.mjs";

const [witnessId, privateKeyPath, policyPath, resolutionPath, previousStatusPath, previousStatusChainPath, suspensionEffectPath, firstStatusPath, presenceEvidencePath, ledgerPath, ledgerReceiptPath, activationObservedAtText, firstStatusObservedAtText, outputPath] = process.argv.slice(2);
if (!outputPath) { process.stderr.write("usage: node attest-recovery-time-observation.mjs WITNESS_ID PRIVATE_KEY POLICY RESOLUTION PREVIOUS_STATUS PREVIOUS_STATUS_CHAIN SUSPENSION_EFFECT FIRST_STATUS PRESENCE_EVIDENCE ANCHOR_LEDGER LEDGER_RECEIPT ACTIVATION_OBSERVED_AT_MS FIRST_STATUS_OBSERVED_AT_MS OUTPUT\n"); process.exit(2); }
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`, resolutionText = readFileSync(resolutionPath, "utf8"), resolution = JSON.parse(resolutionText), firstStatusText = readFileSync(firstStatusPath, "utf8"), presenceText = readFileSync(presenceEvidencePath, "utf8"), receiptText = readFileSync(ledgerReceiptPath, "utf8"), receipt = JSON.parse(receiptText), activationObservedAtMs = Number(activationObservedAtText), firstStatusObservedAtMs = Number(firstStatusObservedAtText);
const privateKey = createPrivateKey(readFileSync(privateKeyPath)), policyText = readFileSync(policyPath, "utf8"), policy = JSON.parse(policyText), witness = policy.timeWitnesses?.find(value => value.id === witnessId);
const previousStatusText = readFileSync(previousStatusPath, "utf8");
const previousStatus = JSON.parse(previousStatusText), previousStatusChain = JSON.parse(readFileSync(previousStatusChainPath, "utf8"));
const suspensionEffect = JSON.parse(readFileSync(suspensionEffectPath, "utf8"));
const ledgerText = readFileSync(ledgerPath, "utf8"), ledger = JSON.parse(ledgerText);
if (!witness || witness.keyDigest !== digest(createPublicKey(privateKey).export({ type: "spki", format: "der" }))) throw new Error("private key does not match policy witness");
if (resolution.recoveryPolicyDigest !== digest(policyText)) throw new Error("policy is not the one bound by recovery resolution");
if (resolution.previousStatusDigest !== digest(previousStatusText)) throw new Error("resolution is not bound to supplied suspended status");
if (!verifyPreviousStatusChainBundle(previousStatusChain, previousStatus, policy).ok) throw new Error("previous status is not the authentic terminal incident state");
if (!verifyPreviousStatusSuspensionEffect(suspensionEffect, previousStatus, policy).ok) throw new Error("previous status suspension effect not established on frozen inventory");
if (receipt.schema !== "cct-network-history-anchor-ledger-receipt/v1" || !verify(null, Buffer.from(JSON.stringify(ledgerReceiptBody(receipt))), createPublicKey(witness.publicKeyPem), Buffer.from(receipt.signatureBase64 ?? "", "base64"))) throw new Error("ledger receipt signature invalid");
if (ledger.schema !== "cct-network-history-anchor-ledger/v1" || ledger.generation !== ledger.anchors?.length || ledger.stateDigest !== digest(JSON.stringify(anchorLedgerBody(ledger))) || receipt.ledgerDigest !== digest(ledgerText) || receipt.ledgerGeneration !== ledger.generation || receipt.sourceRegistryDigest !== ledger.sourceRegistryDigest || ledger.sourceRegistryDigest !== policy.controlRegistry?.sourceRegistryDigest) throw new Error("ledger receipt does not bind expected policy registry state");
if (receipt.witnessId !== witnessId || !Number.isSafeInteger(activationObservedAtMs) || !Number.isSafeInteger(firstStatusObservedAtMs) || activationObservedAtMs < receipt.signedAtMs || activationObservedAtMs < resolution.resolvedAtMs || activationObservedAtMs > resolution.activateByMs || firstStatusObservedAtMs < activationObservedAtMs || firstStatusObservedAtMs > resolution.firstStatusByMs) throw new Error("invalid recovery time observation order or bounds");
const value = { schema: "cct-recovery-time-observation/v1", witnessId, resolutionDigest: digest(resolutionText), firstStatusDigest: digest(firstStatusText), presenceEvidenceDigest: digest(presenceText), ledgerReceiptDigest: digest(receiptText), ledgerReceiptSignedAtMs: receipt.signedAtMs, activationObservedAtMs, firstStatusObservedAtMs };
atomicReplaceDurable(outputPath, `${JSON.stringify({ ...value, signatureBase64: sign(null, Buffer.from(JSON.stringify(recoveryTimeObservationBody(value))), privateKey).toString("base64") })}\n`);
