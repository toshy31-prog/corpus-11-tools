import { createHash, createPrivateKey, sign } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { atomicReplaceDurable } from "./atomic-replace.mjs";

const [inventoryDir, holderId, controller, failureDomain, privateKeyPath, manifestPath] = process.argv.slice(2);
if (!manifestPath) {
  process.stderr.write("usage: node seal-custody-inventory.mjs INVENTORY HOLDER CONTROLLER DOMAIN PRIVATE_KEY MANIFEST\n");
  process.exit(2);
}
const digest = text => `sha256:${createHash("sha256").update(text).digest("hex")}`;
const receiptDigests = readdirSync(inventoryDir).filter(name => name.endsWith(".json")).map(name => digest(readFileSync(`${inventoryDir}/${name}`, "utf8"))).sort();
if (!receiptDigests.length || new Set(receiptDigests).size !== receiptDigests.length) {
  process.stderr.write(`${JSON.stringify({ ok: false, failure: "inventory_empty_or_duplicate" })}\n`);
  process.exit(1);
}
const body = { schema: "cct-custody-inventory-manifest/v1", holderId, controller, failureDomain, receiptDigests };
const manifest = { ...body, signatureBase64: sign(null, Buffer.from(JSON.stringify(body)), createPrivateKey(readFileSync(privateKeyPath))).toString("base64") };
atomicReplaceDurable(manifestPath, `${JSON.stringify(manifest)}\n`);
process.stdout.write(`${JSON.stringify({ ok: true, holderId, receiptCount: receiptDigests.length })}\n`);
