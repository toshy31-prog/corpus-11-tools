#!/usr/bin/env node
import fs from "node:fs";

const files = [
  "lib/evidence-algebra.mjs",
  "lib/multisource-decision.mjs",
  "lib/resolution-evidence.mjs",
  "scripts/live-track-resolution-engine.mjs"
];

console.log(
  "=== EVIDENCE ALGEBRA V11 AUDIT ==="
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
        /summarizeIdentity|sourceSet|IndependentSources|externalSupportSummary|candidateSupportsArtist|sourceFamily|evidenceGate/iu
          .test(line)
      ) {
        console.log(
          `${String(index + 1).padStart(5)}  ${line}`
        );
      }
    }
  );
}

const multi =
  fs.readFileSync(
    "lib/multisource-decision.mjs",
    "utf8"
  );

const algebra =
  fs.readFileSync(
    "lib/evidence-algebra.mjs",
    "utf8"
  );

console.log(
  "\n===== INVARIANTS V11 ====="
);

console.log(
  JSON.stringify(
    {
      centralSupportKernelPresent:
        algebra.includes(
          "export function summarizeIdentityObservations"
        ) &&
        algebra.includes(
          "export function summarizeIdentityPackets"
        ),

      multisourceDelegatesToKernel:
        multi.includes(
          "summarizeIdentityPackets("
        ),

      multisourceLocalAggregatorRemoved:
        !multi.includes(
          "const byArtist = new Map()"
        ),

      resolutionEvidenceStillPending:
        fs.readFileSync(
          "lib/resolution-evidence.mjs",
          "utf8"
        ).includes(
          "function sourceSet("
        ),

      liveGateStillPending:
        fs.readFileSync(
          "scripts/live-track-resolution-engine.mjs",
          "utf8"
        ).includes(
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
