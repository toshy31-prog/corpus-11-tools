#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const cctRoot = resolve(here, "..");
const v14 = resolve(cctRoot, "sequenced-restoration-v1.4");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const hashFile = (path) => sha256(readFileSync(path));

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

function fileMap(root, excluded = new Set()) {
  return Object.fromEntries(regularFiles(root)
    .map((path) => [relative(root, path).replaceAll("\\", "/"), path])
    .filter(([path]) => !excluded.has(path))
    .map(([path, absolute]) => [path, hashFile(absolute)]));
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
    digestAlgorithm: "sha256",
    treeDigest: sha256(files.map(([path, digest]) => `${digest}  ${path}\n`).join("")),
  };
}

function run(id, cwd, args, kind, expectedTests = null) {
  const result = spawnSync(process.execPath, args, { cwd, encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    throw new Error(`${id} failed with status ${result.status}`);
  }
  if (kind === "tap") {
    const tests = Number(result.stdout.match(/^# tests (\d+)$/m)?.[1]);
    const passed = Number(result.stdout.match(/^# pass (\d+)$/m)?.[1]);
    const failed = Number(result.stdout.match(/^# fail (\d+)$/m)?.[1]);
    if (tests !== expectedTests || passed !== expectedTests || failed !== 0) throw new Error(`${id} TAP summary mismatch`);
    return { id, status: 0, tests, passed, failed };
  }
  const parsed = JSON.parse(result.stdout);
  return { id, status: 0, result: parsed };
}

const commands = [
  run("v1.4-tests", v14, ["--test", "test.mjs"], "tap", 10),
  run("v1.4-structural-validation", v14, ["run-structural-validation.mjs", "--check"], "json"),
  run("v1.4-freeze", v14, ["verify-freeze.mjs"], "json"),
  run("v10.35-tests", here, ["--test", "test.mjs"], "tap", 4),
  run("v10.35-network-tests", here, ["--test", "test-network-separation-evidence.mjs"], "tap", 9),
  run("v10.35-held-out", here, ["held-out/run-confrontation.mjs"], "json"),
];

const report = {
  schema: "cct-cumulative-validation-report/v1",
  candidate: "CCT-EXEC-10.35-EXTERNAL-OBSERVER-SEPARATION-PROTOCOL-CANDIDATE-001",
  observedAt: "2026-09-09",
  inputSnapshot: {
    v14Files: fileMap(v14),
    candidateFiles: fileMap(here, new Set(["cumulative-validation-report.json", "freeze.json", "validation.json"])),
    intermediateCandidateLineage: lineageSnapshot(),
  },
  commands,
  invariantDisposition: {
    preserved: 12,
    replaced: 0,
    withdrawn: 0,
  },
  adversarialControls: {
    mainNegativeCases: ["replayed nonce", "shared process identity", "shared instance identity"],
    networkNegativeTestCount: 9,
    heldOutExpectedFailure: "separation_artifact_hash_mismatch",
  },
  result: "cumulative_local_validation_passed",
  promotionVerdict: "promotion_candidate",
  statusBoundary: {
    scope: "local_synthetic_consolidation_only",
    hostSeparation: "not_claimed",
    externalIndependence: "not_claimed",
    deployment: "not_claimed",
    independence: "independence_unknown"
  }
};

if (process.argv.includes("--check")) {
  const expected = JSON.parse(readFileSync(join(here, "cumulative-validation-report.json"), "utf8"));
  if (JSON.stringify(report) !== JSON.stringify(expected)) throw new Error("cumulative validation report mismatch");
  process.stdout.write(`${JSON.stringify({ valid: true, commands: commands.length, candidateFiles: Object.keys(report.inputSnapshot.candidateFiles).length, lineageFiles: report.inputSnapshot.intermediateCandidateLineage.fileCount }, null, 2)}\n`);
} else {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}
