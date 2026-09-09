import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const [axesPath, classesPath] = process.argv.slice(2);
if (!classesPath) { process.stderr.write("usage: node verify-leakage-class-coverage.mjs AXIS_REGISTRY CLASS_REGISTRY\n"); process.exit(2); }
const axes = JSON.parse(readFileSync(axesPath, "utf8"));
const classes = JSON.parse(readFileSync(classesPath, "utf8"));
const requiredAxes = ["sourceInterface", "encoding", "sizeClass", "timing", "route"];
const axisValuesValid = requiredAxes.every(axis => Array.isArray(axes.axes?.[axis]) && axes.axes[axis].length > 0 && new Set(axes.axes[axis]).size === axes.axes[axis].length && JSON.stringify(axes.axes[axis]) === JSON.stringify([...axes.axes[axis]].sort()));
const combinations = axisValuesValid ? requiredAxes.reduce((rows, axis) => rows.flatMap(row => axes.axes[axis].map(value => ({ ...row, [axis]: value }))), [{}]) : [];
const classId = combination => `lc-${createHash("sha256").update(JSON.stringify(combination)).digest("hex").slice(0, 16)}`;
const expected = combinations.map(combination => ({ classId: classId(combination), ...combination }));
const actual = classes.classes ?? [];
const duplicateClassIds = actual.length - new Set(actual.map(item => item.classId)).size;
const expectedMap = new Map(expected.map(item => [item.classId, item]));
const actualMap = new Map(actual.map(item => [item.classId, item]));
const missingClassIds = expected.filter(item => !actualMap.has(item.classId)).map(item => item.classId);
const unexpectedClassIds = actual.filter(item => !expectedMap.has(item.classId) || JSON.stringify(item) !== JSON.stringify(expectedMap.get(item.classId))).map(item => item.classId);
const ok = axes.schema === "cct-leakage-mechanism-axis-registry/v1" && classes.schema === "cct-leakage-probe-class-registry/v2" && axisValuesValid && duplicateClassIds === 0 && missingClassIds.length === 0 && unexpectedClassIds.length === 0;
process.stdout.write(`${JSON.stringify({ ok, axisValuesValid, expectedClasses: expected.length, actualClasses: actual.length, duplicateClassIds, missingClassIds, unexpectedClassIds, openWorldCoverageEstablished: false })}\n`);
if (!ok) process.exitCode = 1;
