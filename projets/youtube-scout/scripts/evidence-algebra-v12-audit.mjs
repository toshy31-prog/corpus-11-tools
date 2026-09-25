#!/usr/bin/env node
import fs from "node:fs";

const files = [
  "lib/evidence-algebra.mjs",
  "lib/multisource-decision.mjs",
  "lib/resolution-evidence.mjs",
  "scripts/live-track-resolution-engine.mjs"
];

console.log(
  "=== EVIDENCE ALGEBRA V12 AUDIT ==="
);

for (const file of files) {
  const source =
    fs.readFileSync(
      file,
      "utf8"
    );

  const lines =
    source.split(/\r?\n/u);

  console.log(
    `\n===== ${file} =====`
  );

  lines.forEach(
    (line, index) => {
      if (
        /summarizeIdentityCandidateGroups|countIndependentSourceFamilies|sourceSet|IndependentSources|externalSupportSummary|candidateSupportsArtist|sourceFamily|evidenceGate/iu
          .test(line)
      ) {
        console.log(
          `${String(index + 1).padStart(5)}  ${line}`
        );
      }
    }
  );
}

const algebra =
  fs.readFileSync(
    "lib/evidence-algebra.mjs",
    "utf8"
  );

const resolution =
  fs.readFileSync(
    "lib/resolution-evidence.mjs",
    "utf8"
  );

const live =
  fs.readFileSync(
    "scripts/live-track-resolution-engine.mjs",
    "utf8"
  );

console.log(
  "\n===== INVARIANTS V12 ====="
);

console.log(
  JSON.stringify(
    {
      candidateSupportKernelPresent:
        algebra.includes(
          "export function summarizeIdentityCandidateGroups"
        ),

      independentSourceCounterPresent:
        algebra.includes(
          "export function countIndependentSourceFamilies"
        ),

      resolutionEvidenceDelegates:
        resolution.includes(
          "summarizeIdentityCandidateGroups("
        ) &&
        resolution.includes(
          "countIndependentSourceFamilies("
        ),

      resolutionEvidenceLocalSourceSetRemoved:
        !resolution.includes(
          "function sourceSet("
        ),

      liveGateStillPending:
        live.includes(
          "function externalSupportSummary("
        )
    },
    null,
    2
  )
);

console.log(
  "\nREAD ONLY — aucune mutation du graphe."
);
