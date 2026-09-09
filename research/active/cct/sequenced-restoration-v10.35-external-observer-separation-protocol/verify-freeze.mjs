#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const cctRoot = resolve(here, "..");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const hashFile = (path) => sha256(readFileSync(path));
const errors = [];

function regularFiles(root) {
  const files = [];
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile()) files.push(path);
    }
  }
  visit(root);
  return files.sort();
}

function lineageSnapshot() {
  const files = [];
  for (const entry of readdirSync(cctRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith("sequenced-restoration-v")) continue;
    if (entry.name === "sequenced-restoration-v1.4" || entry.name === "sequenced-restoration-v10.35-external-observer-separation-protocol") continue;
    for (const path of regularFiles(join(cctRoot, entry.name))) {
      files.push([relative(here, path).replaceAll("\\", "/"), hashFile(path)]);
    }
  }
  files.sort(([left], [right]) => left.localeCompare(right));
  return {
    fileCount: files.length,
    treeDigest: sha256(files.map(([path, digest]) => `${digest}  ${path}\n`).join("")),
  };
}

const freeze = JSON.parse(readFileSync(join(here, "freeze.json"), "utf8"));
const actualFiles = regularFiles(here).map((path) => relative(here, path).replaceAll("\\", "/")).filter((path) => path !== "freeze.json");
const declaredFiles = Object.keys(freeze.files ?? {}).sort();
if (JSON.stringify(actualFiles) !== JSON.stringify(declaredFiles)) errors.push("candidate file set differs from exhaustive freeze");
for (const [file, expected] of Object.entries(freeze.files ?? {})) {
  const actual = hashFile(resolve(here, file));
  if (actual !== expected) errors.push(`${file}: expected ${expected}, got ${actual}`);
}

const lineage = lineageSnapshot();
if (lineage.fileCount !== freeze.intermediateCandidateLineage?.fileCount) errors.push("intermediate lineage file count mismatch");
if (lineage.treeDigest !== freeze.intermediateCandidateLineage?.treeDigest) errors.push("intermediate lineage tree digest mismatch");

const basisPath = resolve(here, freeze.basisFreeze.path);
if (hashFile(basisPath) !== freeze.basisFreeze.sha256) errors.push("v1.4 basis freeze hash mismatch");
const migration = JSON.parse(readFileSync(join(here, "migration.json"), "utf8"));
if (migration.authoritativeInvariants?.length !== 12) errors.push("v1.4 invariant map incomplete");
if (migration.authoritativeInvariants?.some((entry) => !["preserved", "replaced", "withdrawn"].includes(entry.status))) errors.push("invalid invariant disposition");
if (migration.replacedInvariants?.length !== 0 || migration.withdrawnInvariants?.length !== 0) errors.push("unexpected v1.4 invariant removal");

const report = JSON.parse(readFileSync(join(here, "cumulative-validation-report.json"), "utf8"));
const validation = JSON.parse(readFileSync(join(here, "validation.json"), "utf8"));
if (hashFile(join(here, "cumulative-validation-report.json")) !== validation.reportSha256) errors.push("validation report hash mismatch");
if (report.result !== "cumulative_local_validation_passed" || report.promotionVerdict !== "promotion_candidate") errors.push("cumulative result not promotable");
if (validation.verdict !== "promotion_candidate") errors.push("validation verdict mismatch");

const spec = JSON.parse(readFileSync(join(here, "spec.json"), "utf8"));
if (spec.independence !== "independence_unknown") errors.push("independence boundary missing from spec");
if (!spec.notEstablished?.includes("host_independence") || !spec.notEstablished?.includes("external_independence") || !spec.notEstablished?.includes("deployment")) errors.push("required non-claims missing from spec");
for (const file of ["runtime.mjs", "fixtures.mjs", "observer-process.mjs", "component-process.mjs", "verify-separated-run.mjs", "verify-separated-campaign.mjs", "verify-and-record-campaign.mjs"]) {
  const text = readFileSync(join(here, file), "utf8");
  if (/componentBootId|distinctBootIds|uniqueComponentBootIds|uniqueObserverBootIds|synthetic-component-boot|synthetic-observer-boot/.test(text)) errors.push(`${file}: pseudo boot identifier remains`);
}

process.stdout.write(`${JSON.stringify({ valid: errors.length === 0, freezeId: freeze.id, candidateFiles: declaredFiles.length, lineageFiles: lineage.fileCount, invariants: migration.authoritativeInvariants?.length ?? 0, errors }, null, 2)}\n`);
process.exitCode = errors.length ? 1 : 0;
