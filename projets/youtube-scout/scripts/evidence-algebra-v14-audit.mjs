#!/usr/bin/env node
import fs from "node:fs";

const files = [
  "lib/evidence-algebra.mjs",
  "lib/resolution-evidence.mjs",
  "lib/multisource-decision.mjs",
  "scripts/live-track-resolution-engine.mjs"
];

console.log(
  "=== EVIDENCE ALGEBRA V14 AUDIT ==="
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
        /enforceKnownIdentityCorroboration|applyLiveEvidenceGate|known_identity_disagreement_requires_corroboration|preferredIndependentSources|minimumIndependentSources|strongSingleSourceThreshold|evidenceGate/iu
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

const resolution =
  fs.readFileSync(
    "lib/resolution-evidence.mjs",
    "utf8"
  );

const multisource =
  fs.readFileSync(
    "lib/multisource-decision.mjs",
    "utf8"
  );

console.log(
  "\n===== INVARIANTS V14 ====="
);

console.log(
  JSON.stringify(
    {
      centralCorroborationPolicyPresent:
        algebra.includes(
          "export function enforceKnownIdentityCorroboration"
        ),

      liveDelegatesDecisionPolicy:
        live.includes(
          "enforceKnownIdentityCorroboration({"
        ),

      liveHardcodedTwoSourceGateRemoved:
        !live.includes(
          "preferredSources.length < 2"
        ),

      resolutionDecisionStillPending:
        resolution.includes(
          "summary.preferredIndependentSources < 2"
        ),

      multisourceDecisionStillPending:
        multisource.includes(
          "minimumIndependentSources = 2"
        )
    },
    null,
    2
  )
);

console.log(
  "\nREAD ONLY — aucune mutation du graphe."
);
