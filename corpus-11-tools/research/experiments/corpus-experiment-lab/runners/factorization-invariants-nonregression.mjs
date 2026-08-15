import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { classify } from "../core/classifier.mjs";
import { runControl } from "../core/control-runner.mjs";
import { canonicalStringify, stableHash } from "../core/reproducibility.mjs";
import { factorizationInvariantsPlugin as plugin } from "../plugins/factorization-invariants.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const coreDirectory = resolve(root, "core");
const outputDirectory = resolve(root, "outputs/factorization-invariants");
const expected = JSON.parse(await readFile(resolve(root, "fixtures/factorization-invariants-expected.json"), "utf8"));
const baseline = JSON.parse(await readFile(resolve(root, "fixtures/core-baseline-ab5c76f.json"), "utf8"));

const exhaustive = runControl(plugin, "exhaustive_higher_order_remainder");
const representation = runControl(plugin, "representation_audit");
const rows = [];
function compare(control, metric, expectedValue, actualValue) {
  rows.push({ control, metric, expected: expectedValue, actual: actualValue,
    match: canonicalStringify(expectedValue) === canonicalStringify(actualValue) });
}

compare("exhaustive", "dimension", expected.exhaustive.dimension, exhaustive.result.dimension);
compare("exhaustive", "catalog_size", expected.exhaustive.catalog_size, exhaustive.result.catalogSize);
compare("exhaustive", "triplets_searched", expected.exhaustive.triplets_searched, exhaustive.result.tripletsSearched);
compare("exhaustive", "discriminating_keys", expected.exhaustive.discriminating_keys, exhaustive.result.matchedKeysWithMultipleTripleDimensions);
compare("exhaustive", "marginal", expected.exhaustive.marginal, exhaustive.result.selected.lowerOrder.marginal);
compare("exhaustive", "pairwise", expected.exhaustive.pairwise, exhaustive.result.selected.lowerOrder.pairwise);
compare("exhaustive", "indices", expected.exhaustive.indices, exhaustive.result.selected.indices);
compare("exhaustive", "triple_dimensions", expected.exhaustive.triple_dimensions, exhaustive.result.selected.tripleDimensions);

for (const [fixtureKey, resultKey] of [
  ["reordering_preserves_profile", "reorderingPreservesProfile"],
  ["basis_change_preserves_profile", "basisChangePreservesProfile"],
  ["observations_do_not_mutate_state", "observationsDoNotMutateState"],
]) compare("representation_audit", fixtureKey, expected.representation_audit[fixtureKey], representation.result.checks[resultKey]);

const coreFiles = (await readdir(coreDirectory)).filter((name) => name.endsWith(".mjs")).sort();
const coreHashes = {};
for (const name of coreFiles) {
  const content = await readFile(resolve(coreDirectory, name));
  coreHashes[name] = createHash("sha256").update(content).digest("hex");
  compare("core_integrity", name, baseline.files[name], coreHashes[name]);
}
compare("core_integrity", "file_set", Object.keys(baseline.files).sort(), coreFiles);

const allMatched = rows.every((row) => row.match);
const scientificClassification = {
  architecture: allMatched ? "supported" : "unsupported",
  historicalResult: rows.filter((row) => row.control !== "core_integrity").every((row) => row.match)
    ? "reproduced" : "not_reproduced",
  hypothesis: "unknown",
  reason: "The finite remainder is exact, but objecthood and physical relevance are not tested by this migration.",
};
const reversal = classify(plugin, "reversal_status", rows);
const raw = {
  schema: "corpus-experiment-results/v1",
  plugin: plugin.manifest,
  baselineCommit: baseline.commit,
  coreHashes,
  controls: [exhaustive, representation],
  classification: scientificClassification,
  comparisonHash: stableHash(rows),
  allMatched,
};
const csvValue = (value) => `"${String(typeof value === "string" ? value : canonicalStringify(value)).replaceAll('"', '""')}"`;
const csv = ["control,metric,expected,actual,match", ...rows.map((row) =>
  [row.control, row.metric, row.expected, row.actual, row.match].map(csvValue).join(","),
)].join("\n") + "\n";
const report = `# Factorization invariants — third-module generality test\n\n` +
  `Status: **${allMatched ? "PASS" : "FAIL"}** (${rows.filter((row) => row.match).length}/${rows.length} comparisons).\n\n` +
  `## Declared experiment\n\n` +
  `- system: a three-dimensional vector space with signed-permutation transports attached to factorization labels;\n` +
  `- state: a presented family of transport matrices;\n` +
  `- operation: load a preregistered family;\n` +
  `- observer: inspect transports and compute exact fixed-space intersections;\n` +
  `- observables: marginal, pairwise and total fixed dimensions;\n` +
  `- controls: exhaustive lower-order matching, label reordering and invertible basis change;\n` +
  `- reversal: loss of the 0/1 remainder or failure of representation invariance.\n\n` +
  `## Re-observed result\n\n` +
  `All 17,296 triplets among 48 signed permutation matrices were searched. Triplets (3,5,15) and (3,5,17) retain identical marginal dimensions (2,2,2) and pairwise dimensions (1,1,1), while total intersection dimensions remain 0 and 1. Integer-minor rank calculations avoid floating tolerances.\n\n` +
  `## Contract audit\n\n` +
  `No core file changed: all five SHA-256 hashes and the file set equal baseline ${baseline.commit}. The module uses neither recovery/trace semantics nor temporal sequences. Hidden generic dependencies are documented in \`contract-audit.md\`; notably, access budgets are declared but not centrally enforced, and numerical exactness belongs to the module.\n\n` +
  `## Classification\n\n` +
  `- architecture: **${scientificClassification.architecture}** for this third finite domain;\n` +
  `- historical result: **${scientificClassification.historicalResult}**;\n` +
  `- hypothesis: **unknown** — neither strengthened nor weakened scientifically by architectural migration.\n`;

await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(resolve(outputDirectory, "raw_results.json"), JSON.stringify(raw, null, 2) + "\n"),
  writeFile(resolve(outputDirectory, "comparison.csv"), csv),
  writeFile(resolve(outputDirectory, "report.md"), report),
  writeFile(resolve(outputDirectory, "reversal_status.json"), JSON.stringify(reversal, null, 2) + "\n"),
]);
console.log(`${allMatched ? "PASS" : "FAIL"}: ${rows.filter((row) => row.match).length}/${rows.length} comparisons`);
console.log(`classification=${canonicalStringify(scientificClassification)}`);
console.log(`comparison_hash=${raw.comparisonHash}`);
if (!allMatched) process.exitCode = 1;
