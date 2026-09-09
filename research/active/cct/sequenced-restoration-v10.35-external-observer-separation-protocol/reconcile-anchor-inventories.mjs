import { createHash, createPublicKey, verify } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";

const [anchorPublicKeyPath, ...inventoryDirs] = process.argv.slice(2);
if (!anchorPublicKeyPath || inventoryDirs.length < 2) {
  process.stderr.write("usage: node reconcile-anchor-inventories.mjs ANCHOR_PUBLIC_KEY INVENTORY_DIR INVENTORY_DIR [...]\n");
  process.exit(2);
}
const key = createPublicKey(readFileSync(anchorPublicKeyPath));
const digest = text => `sha256:${createHash("sha256").update(text).digest("hex")}`;
const holdings = inventoryDirs.map(dir => readdirSync(dir).filter(name => name.endsWith(".json")).map(name => {
  const text = readFileSync(`${dir}/${name}`, "utf8");
  const receipt = JSON.parse(text);
  const body = { schema: receipt.schema, checkpointSchema: receipt.checkpointSchema, registryKeyDigest: receipt.registryKeyDigest, recoveryPolicyDigest: receipt.recoveryPolicyDigest, authorityTransitionDigest: receipt.authorityTransitionDigest, emergencyRatificationDigest: receipt.emergencyRatificationDigest, checkpointDigest: receipt.checkpointDigest, registryStateDigest: receipt.registryStateDigest, generation: receipt.generation, totalRecords: receipt.totalRecords, previousAnchorReceiptDigest: receipt.previousAnchorReceiptDigest };
  const valid = receipt.schema === "cct-monotonic-anchor-receipt/v2" && verify(null, Buffer.from(JSON.stringify(body)), key, Buffer.from(receipt.signatureBase64, "base64"));
  return { digest: digest(text), receipt, valid };
}));
const all = [...new Map(holdings.flat().map(item => [item.digest, item])).values()];
const invalidDigests = all.filter(item => !item.valid).map(item => item.digest);
const generations = [...new Set(all.filter(item => item.valid).map(item => item.receipt.generation))].sort((a, b) => a - b);
const equivocations = generations.flatMap(generation => {
  const atGeneration = all.filter(item => item.valid && item.receipt.generation === generation);
  const states = new Set(atGeneration.map(item => JSON.stringify([item.receipt.checkpointSchema, item.receipt.registryKeyDigest, item.receipt.checkpointDigest, item.receipt.registryStateDigest, item.receipt.totalRecords])));
  return states.size > 1 ? [{ generation, receiptDigests: atGeneration.map(item => item.digest) }] : [];
});
const inventorySets = holdings.map(items => new Set(items.map(item => item.digest)));
const asymmetricHoldings = all.map(item => ({ digest: item.digest, presentIn: inventorySets.map((set, index) => set.has(item.digest) ? index : null).filter(index => index !== null) })).filter(item => item.presentIn.length !== inventoryDirs.length);
const result = { ok: invalidDigests.length === 0 && equivocations.length === 0, inventories: inventoryDirs.length, validReceipts: all.length - invalidDigests.length, generations, asymmetricHoldings, equivocations, invalidDigests };
process.stdout.write(`${JSON.stringify(result)}\n`);
if (invalidDigests.length) process.exitCode = 2;
else if (equivocations.length) process.exitCode = 1;
