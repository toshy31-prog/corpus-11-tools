#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { validateRichDocument } from "../sequenced-recovery/rich-arena-v2/interpreter.mjs";

const rawUrl = new URL("./kryos-bridges-v1.raw.json", import.meta.url);
const expectedUrl = new URL("./admission-report.json", import.meta.url);
const bytes = await readFile(rawUrl);
const document = JSON.parse(bytes.toString("utf8"));
const rich = validateRichDocument(document);
const localHash = createHash("sha256").update(bytes).digest("hex");
const receivedBytes = bytes.at(-1) === 10 ? bytes.subarray(0, -1) : bytes;
const receivedHash = createHash("sha256").update(receivedBytes).digest("hex");

assert.equal(localHash, "758dea88ec849aae6f4a41662f36349b7005d5a062c2a5a80a2111343e72ade1");
assert.equal(receivedHash, "5ac83581e8ddd496dd4b8dddabc528cb346fbd992458d8f9285c1fee892c1645");
assert.equal(rich.valid, false);

const catalog = document.actions?.catalog ?? {};
const textualConditions = Object.values(catalog).filter((action) => typeof action.condition === "string").length;
const probabilisticReactionsWithoutSeed = Number(
  Object.values(document.transitions?.adaptive_reaction ?? {}).some((reaction) => Number.isFinite(reaction?.probability))
  && document.integrity?.deterministic_transitions === true
  && document.source?.seed === undefined,
);

const report = {
  schema: "cct-held-out-intake-review/v1",
  generatedAt: "2026-08-26",
  candidate: {
    title: document.manifest.title,
    version: document.manifest.version,
    declaredSourceRegime: document.manifest.source_regime,
    receivedByteHash: `sha256:${receivedHash}`,
    localCanonicalHash: `sha256:${localHash}`,
    localCanonicalization: "one terminal LF added by the patch-managed workspace copy; removing it reconstructs the received bytes",
  },
  provenance: {
    externalSupplyObserved: true,
    independentSyntheticDeclared: true,
    authorIdPresent: false,
    authorshipTracePresent: false,
    generatorLineageIndependentlyVerified: false,
    frozenBeforeContenderExecution: true,
    boundary: "The receipt and byte hashes are established. Independent authorship and generator separation are not established by the document.",
  },
  structuralAdmission: {
    interpreter: "cct-rich-arena-v2/1.0-candidate",
    admitted: false,
    validatorErrorCount: rich.errors.length,
    validatorErrors: rich.errors,
  },
  semanticExecutability: {
    admitted: false,
    declaredActions: Object.keys(catalog).length,
    executableActionsUnderRichV2: 0,
    blockers: [
      `${textualConditions} action preconditions are prose rather than condition trees`,
      "round events and domain failures use textual triggers/effects rather than ordered numeric operations",
      "delayed effects do not define a general queue and some signs or schedules are semantically ambiguous",
      "range observations omit bin-boundary and rounding conventions",
      "the per-turn budget does not define bundle cardinality, ordering, or interaction semantics",
      "outcomes and reversals use textual formulas/effects rather than executable expressions",
      `${probabilisticReactionsWithoutSeed} probabilistic reaction lacks a seed/RNG rule while integrity claims deterministic execution`,
    ],
  },
  decision: {
    admittedToRichInterpreterV2: false,
    admittedForCct12Comparison: false,
    cctExecutionLaunched: false,
    reason: "Execution would require evaluator-authored semantics and would test those additions rather than the supplied world.",
    nextValidStep: "The original generator must re-emit the same Kryos mechanism in the exact executable contract, without seeing CCT or its prior failures.",
  },
  statusBoundary: "Held-out candidate received, hashed and locally reviewed. No scenario admission, contender run, robustness result, superiority claim, authorization, deployment or external effect is established.",
};

if (process.argv.includes("--check")) {
  const expected = JSON.parse(await readFile(expectedUrl, "utf8"));
  assert.deepEqual(report, expected);
  console.log(JSON.stringify({ valid: true, admitted: false, cctExecutionLaunched: false, receivedHash: report.candidate.receivedByteHash }, null, 2));
} else {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}
