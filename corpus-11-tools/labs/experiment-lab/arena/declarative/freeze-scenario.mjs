import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { computeScenarioHash } from "./hash.mjs";

const [inputArgument, outputArgument] = process.argv.slice(2);
if (!inputArgument || !outputArgument) {
  throw new Error("usage: node freeze-scenario.mjs input.json output.json");
}
const inputPath = resolve(inputArgument);
const outputPath = resolve(outputArgument);
if (inputPath === outputPath) throw new Error("input and output paths must differ");
const document = JSON.parse(await readFile(inputPath, "utf8"));
document.freeze = { algorithm: "sha256", contentHash: computeScenarioHash(document) };
await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`, { flag: "wx" });
process.stdout.write(`${document.freeze.contentHash}\n`);
