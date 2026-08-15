import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { classify } from "../core/classifier.mjs";
import { runControl } from "../core/control-runner.mjs";
import { canonicalStringify, stableHash } from "../core/reproducibility.mjs";
import { recoveryErasurePlugin as plugin } from "../plugins/recovery-erasure.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const outputDirectory = resolve(root, "outputs/recovery-erasure");
const expected = JSON.parse(await readFile(resolve(root, "fixtures/recovery-expected.json"), "utf8"));

const controls = [
  runControl(plugin, "localized_vs_broadcast"),
  runControl(plugin, "matched_erasure_depth"),
  runControl(plugin, "single_edge_robustness"),
  runControl(plugin, "two_edge_no_remainder", { width: 7 }),
  runControl(plugin, "two_edge_no_remainder", { width: 8 }),
];
const byControl = Object.fromEntries(controls.map((control) => [
  control.control + (control.input.width ? `:${control.input.width}` : ""), control.result,
]));

const rows = [];
function compare(control, metric, expectedValue, actualValue) {
  const match = canonicalStringify(expectedValue) === canonicalStringify(actualValue);
  rows.push({ control, metric, expected: expectedValue, actual: actualValue, match });
}

const recovery = byControl.localized_vs_broadcast;
compare("localized_vs_broadcast", "widths", expected.localized_vs_broadcast.widths, recovery.cases.map((item) => item.width));
for (const item of recovery.cases) {
  compare("localized_vs_broadcast", `N=${item.width}:localized:C_info`, 1, item.localized.recoveryCost);
  compare("localized_vs_broadcast", `N=${item.width}:localized:C_erase`, 1, item.localized.erasureCost);
  compare("localized_vs_broadcast", `N=${item.width}:broadcast:C_info`, 1, item.broadcast.recoveryCost);
  compare("localized_vs_broadcast", `N=${item.width}:broadcast:C_erase`, item.width, item.broadcast.erasureCost);
}

const depth = byControl.matched_erasure_depth;
compare("matched_erasure_depth", "degree_profile", expected.matched_erasure_depth.degree_profile, depth.common.degreeProfile);
compare("matched_erasure_depth", "actuator_degree", expected.matched_erasure_depth.actuator_degree, depth.common.actuatorDegree);
compare("matched_erasure_depth", "work", expected.matched_erasure_depth.work, depth.common.work);
compare("matched_erasure_depth", "shallow_depth", expected.matched_erasure_depth.shallow_depth, depth.shallowDepth);
compare("matched_erasure_depth", "deep_depth", expected.matched_erasure_depth.deep_depth, depth.deepDepth);

const robustness = byControl.single_edge_robustness;
compare("single_edge_robustness", "degree_profile", expected.single_edge_robustness.degree_profile, robustness.common.degreeProfile);
compare("single_edge_robustness", "actuator_degree", expected.single_edge_robustness.actuator_degree, robustness.common.actuatorDegree);
compare("single_edge_robustness", "eccentricity", expected.single_edge_robustness.eccentricity, robustness.common.eccentricity);
compare("single_edge_robustness", "tree_a_profile", expected.single_edge_robustness.tree_a_profile, robustness.treeA.residualProfile);
compare("single_edge_robustness", "tree_a_mean", expected.single_edge_robustness.tree_a_mean, `${robustness.treeA.meanNumerator}/${robustness.treeA.meanDenominator}`);
compare("single_edge_robustness", "tree_b_profile", expected.single_edge_robustness.tree_b_profile, robustness.treeB.residualProfile);
compare("single_edge_robustness", "tree_b_mean", expected.single_edge_robustness.tree_b_mean, `${robustness.treeB.meanNumerator}/${robustness.treeB.meanDenominator}`);

for (const width of [7, 8]) {
  const result = byControl[`two_edge_no_remainder:${width}`];
  compare("two_edge_no_remainder", `N=${width}:searched`, expected.two_edge_no_remainder[String(width)].searched, result.searched);
  compare("two_edge_no_remainder", `N=${width}:pair_found`, expected.two_edge_no_remainder[String(width)].pair_found, result.pairFound);
}

const reversal = classify(plugin, "reversal_status", rows);
const allMatched = rows.every((row) => row.match);
const raw = {
  schema: "corpus-experiment-results/v1",
  plugin: plugin.manifest,
  expectedFixtureHash: stableHash(expected),
  controls,
  comparisonHash: stableHash(rows),
  allMatched,
};

const csvValue = (value) => `"${String(typeof value === "string" ? value : canonicalStringify(value)).replaceAll('"', '""')}"`;
const csv = ["control,metric,expected,actual,match", ...rows.map((row) =>
  [row.control, row.metric, row.expected, row.actual, row.match].map(csvValue).join(","),
)].join("\n") + "\n";
const report = `# Recovery / erasure — generic-core non-regression\n\n` +
  `Status: **${allMatched ? "PASS" : "FAIL"}** (${rows.filter((row) => row.match).length}/${rows.length} comparisons).\n\n` +
  `The generic engine re-observed the closed specialized results without containing recovery, erasure, graph, or time semantics. The plugin owns those meanings and the declared observer class.\n\n` +
  `## Re-observed results\n\n` +
  `- localized: C_info=1 and C_erase=1 for N=2..8;\n` +
  `- broadcast: C_info=1 and C_erase=N for N=2..8;\n` +
  `- matched rooted trees: erasure depths 2 and 3 at equal Hamming distance, work, degrees, and root degree;\n` +
  `- matched eccentricity: one-edge residual means 9/5 and 10/5;\n` +
  `- no two-edge remainder under the preregistered matching after exhaustive searches of 7^5 and 8^6 labelled rooted trees.\n\n` +
  `## Hidden conventions exposed by migration\n\n` +
  `1. Historical C_info minimizes over any subset of terminal cells. The interactive lab's read cost instead counts a breadth-first traversal from a fixed read port. They are distinct observables.\n` +
  `2. Historical erasure depth starts after actuator root 0 has been reset. The interactive wave depth includes that reset and is therefore one larger on a connected all-one tree.\n\n` +
  `## Scope\n\n` +
  `This validates a written and tested abstraction and re-observes prior model results. It does not validate hardware, physical universality, or the other planned hypothesis plugins.\n`;

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
