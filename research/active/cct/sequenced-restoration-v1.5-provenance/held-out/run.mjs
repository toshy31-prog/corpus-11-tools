import { readFileSync } from "node:fs";
import { validateReceiptProvenance } from "../contract.mjs";

const spec = JSON.parse(readFileSync(new URL("../spec.json", import.meta.url)));
const attack = JSON.parse(readFileSync(new URL("./shared-origin-receipts.json", import.meta.url)));
const errors = validateReceiptProvenance(spec, attack);
const passed = errors.includes("reused:sourceCollectionRoot:single-survey");
console.log(JSON.stringify({ provenance: attack.provenance, passed, errors }, null, 2));
process.exitCode = passed ? 0 : 1;
