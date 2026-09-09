import { createHash, createPrivateKey, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import { atomicReplaceDurable } from "./atomic-replace.mjs";
import { ledgerReceiptBody } from "./network-separation-history-anchor.mjs";

const [witnessId, witnessPrivateKeyPath, ledgerPath, outputPath] = process.argv.slice(2);
if (!outputPath) { process.stderr.write("usage: node sign-network-history-anchor-ledger.mjs WITNESS_ID PRIVATE_KEY LEDGER OUTPUT\n"); process.exit(2); }
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`, ledgerText = readFileSync(ledgerPath, "utf8"), ledger = JSON.parse(ledgerText);
const value = { schema: "cct-network-history-anchor-ledger-receipt/v1", witnessId, ledgerDigest: digest(ledgerText), ledgerGeneration: ledger.generation, sourceRegistryDigest: ledger.sourceRegistryDigest, signedAtMs: Date.now() };
atomicReplaceDurable(outputPath, `${JSON.stringify({ ...value, signatureBase64: sign(null, Buffer.from(JSON.stringify(ledgerReceiptBody(value))), createPrivateKey(readFileSync(witnessPrivateKeyPath))).toString("base64") })}\n`);
