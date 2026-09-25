#!/usr/bin/env node
import fs from "node:fs";

const files = [
  "lib/evidence-algebra.mjs",
  "lib/resolution-evidence.mjs",
  "lib/multisource-decision.mjs",
  "scripts/live-track-resolution-engine.mjs"
];

console.log(
  "=== EVIDENCE ALGEBRA V13 AUDIT ==="
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
        /candidateSupportsArtist|candidateSupportsIdentity|summarizeExternalIdentitySupport|externalSupportSummary|applyLiveEvidenceGate|sourceFamily|IndependentSources|evidenceGate/iu
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

const live =
  fs.readFileSync(
    "scripts/live-track-resolution-engine.mjs",
    "utf8"
  );

console.log(
  "\n===== INVARIANTS V13 ====="
);

console.log(
  JSON.stringify(
    {
      centralCandidateSupportPresent:
        algebra.includes(
          "export function candidateSupportsIdentity"
        ),

      centralExternalSupportPresent:
        algebra.includes(
          "export function summarizeExternalIdentitySupport"
        ),

      liveLocalCandidateMatcherRemoved:
        !live.includes(
          "function candidateSupportsArtist("
        ),

      liveDelegatesExternalSupport:
        live.includes(
          "summarizeExternalIdentitySupport("
        ),

      liveDecisionPolicyStillLocal:
        live.includes(
          "function applyLiveEvidenceGate("
        )
    },
    null,
    2
  )
);

console.log(
  "\nREAD ONLY — aucune mutation du graphe."
);
