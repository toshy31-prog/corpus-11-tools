import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { classify } from "../core/classifier.mjs";
import { runControl } from "../core/control-runner.mjs";
import { canonicalStringify, stableHash } from "../core/reproducibility.mjs";
import { temporalFrustrationPlugin as plugin } from "../plugins/temporal-frustration.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const coreDirectory = resolve(root, "core");
const outputDirectory = resolve(root, "outputs/temporal-frustration");
const expected = JSON.parse(await readFile(resolve(root, "fixtures/temporal-frustration-expected.json"), "utf8"));
const baseline = JSON.parse(await readFile(resolve(root, "fixtures/core-baseline-ab5c76f.json"), "utf8"));

const exhaustive = runControl(plugin, "exhaustive_matched_local_remainder");
const methodAudit = runControl(plugin, "representation_and_method_audit");
const rows = [];
function compare(control, metric, expectedValue, actualValue) {
  rows.push({ control, metric, expected: expectedValue, actual: actualValue,
    match: canonicalStringify(expectedValue) === canonicalStringify(actualValue) });
}

compare("exhaustive", "width", expected.exhaustive.width, exhaustive.result.width);
compare("exhaustive", "total_tournaments", expected.exhaustive.total_tournaments, exhaustive.result.totalTournaments);
compare("exhaustive", "discriminating_keys", expected.exhaustive.discriminating_keys, exhaustive.result.matchedKeysWithMultipleFrustrations);
compare("exhaustive", "score_sequence", expected.exhaustive.score_sequence, exhaustive.result.selected.local.scoreSequence);
compare("exhaustive", "cyclic_triangles", expected.exhaustive.cyclic_triangles, exhaustive.result.selected.local.cyclicTriangles);
compare("exhaustive", "masks", expected.exhaustive.masks, exhaustive.result.selected.masks);
compare("exhaustive", "minimum_backward_edges", expected.exhaustive.minimum_backward_edges, exhaustive.result.selected.minimumBackwardEdges);
compare("exhaustive", "fractions", expected.exhaustive.fractions, exhaustive.result.selected.fractions);

for (const [fixtureKey, resultKey] of [
  ["candidate_does_not_define_minimum", "candidateDoesNotDefineMinimum"],
  ["relabelling_preserves_local_summary", "relabellingPreservesLocalSummary"],
  ["relabelling_preserves_minimum", "relabellingPreservesMinimum"],
  ["reversal_preserves_minimum", "reversalPreservesMinimum"],
]) compare("method_audit", fixtureKey, expected.method_audit[fixtureKey], methodAudit.result.checks[resultKey]);

const coreFiles = (await readdir(coreDirectory)).filter((name) => name.endsWith(".mjs")).sort();
const coreHashes = {};
for (const name of coreFiles) {
  const content = await readFile(resolve(coreDirectory, name));
  coreHashes[name] = createHash("sha256").update(content).digest("hex");
  compare("core_integrity", name, baseline.files[name], coreHashes[name]);
}
compare("core_integrity", "file_set", Object.keys(baseline.files).sort(), coreFiles);

const allMatched = rows.every((row) => row.match);
const reversal = classify(plugin, "reversal_status", rows);
const raw = {
  schema: "corpus-experiment-results/v1",
  plugin: plugin.manifest,
  baselineCommit: baseline.commit,
  coreHashes,
  controls: [exhaustive, methodAudit],
  comparisonHash: stableHash(rows),
  allMatched,
};
const csvValue = (value) => `"${String(typeof value === "string" ? value : canonicalStringify(value)).replaceAll('"', '""')}"`;
const csv = ["control,metric,expected,actual,match", ...rows.map((row) =>
  [row.control, row.metric, row.expected, row.actual, row.match].map(csvValue).join(","),
)].join("\n") + "\n";
const report = `# Temporal frustration — second-plugin portability test\n\n` +
  `Status: **${allMatched ? "PASS" : "FAIL"}** (${rows.filter((row) => row.match).length}/${rows.length} comparisons).\n\n` +
  `The second scientific domain was implemented without changing any file in \`core/\`; all five core SHA-256 hashes equal the baseline commit ${baseline.commit}.\n\n` +
  `## Re-observed finite result\n\n` +
  `- all 32,768 labelled tournaments on six vertices were enumerated;\n` +
  `- five matched local keys admit multiple exact frustrations;\n` +
  `- masks 8 and 10 share score sequence (5,3,3,2,1,1) and three cyclic triangles;\n` +
  `- their exact minimum feedback-arc counts remain 1 and 2, hence F_T=1/15 and 2/15.\n\n` +
  `## Method-effect audit\n\n` +
  `The directed relations are inputs; the engine's command journal is not read by the optimizer. A supplied candidate order is scored but does not replace minimization. Exact F_T is preserved under vertex relabelling and reversal of every relation.\n\n` +
  `## Strongest supported conclusion\n\n` +
  `The current core is portable across two structurally different finite modules without a special execution path. This is evidence for architectural separation, not proof that the contract covers arbitrary future sciences or that F_T is temporal or physical.\n`;

await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(resolve(outputDirectory, "raw_results.json"), JSON.stringify(raw, null, 2) + "\n"),
  writeFile(resolve(outputDirectory, "comparison.csv"), csv),
  writeFile(resolve(outputDirectory, "report.md"), report),
  writeFile(resolve(outputDirectory, "reversal_status.json"), JSON.stringify(reversal, null, 2) + "\n"),
]);
console.log(`${allMatched ? "PASS" : "FAIL"}: ${rows.filter((row) => row.match).length}/${rows.length} comparisons`);
console.log(`comparison_hash=${raw.comparisonHash}`);
if (!allMatched) process.exitCode = 1;
