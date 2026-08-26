#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { canonicalStringify } from "../../../../corpus-11-tools/labs/experiment-lab/core/reproducibility.mjs";

const [input, output] = process.argv.slice(2);
if (!input || !output || input === output) throw new Error("usage: node freeze-contenders.mjs draft.json frozen.json");
const document = JSON.parse(await readFile(input, "utf8"));
delete document.freeze;
const contentHash = `sha256:${createHash("sha256").update(canonicalStringify(document)).digest("hex")}`;
document.freeze = { algorithm: "sha256", contentHash };
await writeFile(output, `${JSON.stringify(document, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
console.log(contentHash);
