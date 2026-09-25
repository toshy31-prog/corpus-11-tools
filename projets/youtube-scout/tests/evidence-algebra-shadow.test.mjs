
import test from "node:test";
import assert from "node:assert/strict";

import {
  classifyPair,
  factsFromTrackResolution
} from "../lib/evidence-algebra-shadow-bridge.mjs";

import {
  RELATIONS,
  summarizeEvidence
} from "../lib/evidence-algebra.mjs";

test(
  "une graphie ponctuée proche reste une variante",
  () => {
    assert.equal(
      classifyPair(
        "Jean-Pierre Decerf",
        "Jean Pierre Decerf"
      ),
      RELATIONS.ORTHOGRAPHIC_VARIANT
    );
  }
);

test(
  "un featuring reste un crédit dans le bridge",
  () => {
    const facts =
      factsFromTrackResolution({
        preferredArtists: [
          {
            name: "A",
            role: "primary",
            confidence: 0.9,
            sources: ["title_syntax"]
          }
        ],
        secondaryCredits: [
          {
            name: "B",
            role: "featuring",
            confidence: 0.9,
            sources: ["title_syntax"]
          }
        ],
        issues: []
      });

    const summary =
      summarizeEvidence(
        facts
      );

    assert.equal(
      summary.identityClusters.length,
      1
    );

    assert.equal(
      summary.credits.length,
      1
    );
  }
);
