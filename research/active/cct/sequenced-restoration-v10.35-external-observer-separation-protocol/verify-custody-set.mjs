import { createHash, createPublicKey, verify } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";

const [anchorPublicKeyPath, holderRegistryPath, ...pairs] = process.argv.slice(2);
if (!holderRegistryPath || pairs.length < 2 || pairs.some(pair => !pair.includes("="))) {
  process.stderr.write("usage: node verify-custody-set.mjs ANCHOR_KEY HOLDER_REGISTRY MANIFEST=INVENTORY [...]\n");
  process.exit(2);
}
const anchorKey = createPublicKey(readFileSync(anchorPublicKeyPath));
const registry = JSON.parse(readFileSync(holderRegistryPath, "utf8"));
const holders = new Map(registry.holders?.map(holder => [holder.holderId, holder]) ?? []);
const digest = text => `sha256:${createHash("sha256").update(text).digest("hex")}`;
const rows = pairs.map(pair => {
  const split = pair.indexOf("=");
  const manifestPath = pair.slice(0, split), inventoryDir = pair.slice(split + 1);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const holder = holders.get(manifest.holderId);
  const body = { schema: manifest.schema, holderId: manifest.holderId, controller: manifest.controller, failureDomain: manifest.failureDomain, receiptDigests: manifest.receiptDigests };
  const files = readdirSync(inventoryDir).filter(name => name.endsWith(".json"));
  const receipts = files.map(name => {
    const text = readFileSync(`${inventoryDir}/${name}`, "utf8"), receipt = JSON.parse(text);
    const receiptBody = { schema: receipt.schema, checkpointSchema: receipt.checkpointSchema, registryKeyDigest: receipt.registryKeyDigest, recoveryPolicyDigest: receipt.recoveryPolicyDigest, authorityTransitionDigest: receipt.authorityTransitionDigest, emergencyRatificationDigest: receipt.emergencyRatificationDigest, checkpointDigest: receipt.checkpointDigest, registryStateDigest: receipt.registryStateDigest, generation: receipt.generation, totalRecords: receipt.totalRecords, previousAnchorReceiptDigest: receipt.previousAnchorReceiptDigest };
    return { digest: digest(text), valid: receipt.schema === "cct-monotonic-anchor-receipt/v2" && verify(null, Buffer.from(JSON.stringify(receiptBody)), anchorKey, Buffer.from(receipt.signatureBase64, "base64")) };
  });
  const actualDigests = receipts.map(receipt => receipt.digest).sort();
  const checks = {
    holderRegistered: Boolean(holder),
    metadataBound: Boolean(holder) && holder.controller === manifest.controller && holder.failureDomain === manifest.failureDomain,
    manifestSchema: manifest.schema === "cct-custody-inventory-manifest/v1",
    manifestSignature: Boolean(holder) && verify(null, Buffer.from(JSON.stringify(body)), createPublicKey(holder.publicKeyPem), Buffer.from(manifest.signatureBase64, "base64")),
    exactInventory: JSON.stringify(actualDigests) === JSON.stringify(manifest.receiptDigests),
    anchorReceiptsValid: receipts.length > 0 && receipts.every(receipt => receipt.valid),
  };
  return { holderId: manifest.holderId, controller: manifest.controller, failureDomain: manifest.failureDomain, checks, valid: Object.values(checks).every(Boolean) };
});
const independence = {
  distinctHolders: new Set(rows.map(row => row.holderId)).size === rows.length,
  distinctControllers: new Set(rows.map(row => row.controller)).size === rows.length,
  distinctFailureDomains: new Set(rows.map(row => row.failureDomain)).size === rows.length,
};
const ok = registry.schema === "cct-custody-holder-registry/v1" && rows.every(row => row.valid) && Object.values(independence).every(Boolean);
process.stdout.write(`${JSON.stringify({ ok, custodians: rows.length, independence, rows })}\n`);
if (!ok) process.exitCode = 1;
