import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  summarizeIdentityCandidateGroups,
  countIndependentSourceFamilies
} from "../lib/evidence-algebra.mjs";

import {
  buildResolutionEvidence
} from "../lib/resolution-evidence.mjs";

test(
  "plusieurs candidats d'une même famille restent une seule source indépendante",
  () => {
    const support =
      summarizeIdentityCandidateGroups([
        {
          artist: "A",
          candidates: [
            {
              source: "mb-recording-1",
              sourceFamily: "musicbrainz"
            },
            {
              source: "mb-recording-2",
              sourceFamily: "musicbrainz"
            }
          ]
        }
      ]);

    assert.equal(
      support[0].independentSources,
      1
    );

    assert.deepEqual(
      support[0].sourceFamilies,
      ["musicbrainz"]
    );

    assert.equal(
      countIndependentSourceFamilies(
        support
      ),
      1
    );
  }
);

test(
  "deux familles de fournisseurs valent deux sources indépendantes",
  () => {
    const support =
      summarizeIdentityCandidateGroups([
        {
          artist: "A",
          candidates: [
            {
              source: "musicbrainz"
            },
            {
              source: "discogs"
            }
          ]
        }
      ]);

    assert.equal(
      support[0].independentSources,
      2
    );

    assert.equal(
      countIndependentSourceFamilies(
        support
      ),
      2
    );
  }
);

test(
  "buildResolutionEvidence conserve sa sémantique publique",
  () => {
    const evidence =
      buildResolutionEvidence({
        expected: {
          artists: ["DA Uzi"],
          competingArtists: ["DA"],
          title: "Amour Pouvoir Intelligence"
        },
        candidates: [
          {
            source: "musicbrainz",
            artists: ["DA Uzi"],
            title: "Amour Pouvoir Intelligence"
          }
        ],
        providerSearches: [
          {
            ok: true,
            provider: "musicbrainz"
          }
        ],
        interpreted: {
          issues: [
            {
              type: "topic_channel_disagreement"
            }
          ]
        }
      });

    assert.equal(
      evidence.summary
        .preferredIndependentSources,
      1
    );

    assert.equal(
      evidence.summary
        .competingIndependentSources,
      0
    );

    assert.equal(
      evidence.summary
        .hasKnownContradiction,
      true
    );

    assert.equal(
      evidence.absence[0].conclusive,
      false
    );
  }
);

test(
  "resolution-evidence ne contient plus sourceSet",
  () => {
    const source =
      fs.readFileSync(
        new URL(
          "../lib/resolution-evidence.mjs",
          import.meta.url
        ),
        "utf8"
      );

    assert.equal(
      source.includes(
        "function sourceSet("
      ),
      false
    );

    assert.equal(
      source.includes(
        "summarizeIdentityCandidateGroups("
      ),
      true
    );

    assert.equal(
      source.includes(
        "countIndependentSourceFamilies("
      ),
      true
    );
  }
);
