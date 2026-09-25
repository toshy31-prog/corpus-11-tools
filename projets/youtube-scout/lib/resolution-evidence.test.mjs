import test from "node:test";
import assert from "node:assert/strict";

import {
  buildResolutionEvidence,
  decideFromResolutionEvidence
} from "./resolution-evidence.mjs";

test("deux sources indépendantes soutiennent une identité", () => {
  const evidence =
    buildResolutionEvidence({
      expected: {
        artists: ["Mirwais"],
        competingArtists: [
          "David Gravell"
        ],
        title:
          "Disco Science"
      },

      candidates: [
        {
          source:
            "musicbrainz",
          artists: [
            "Mirwais"
          ],
          title:
            "Disco Science"
        },
        {
          source:
            "discogs",
          artists: [
            "Mirwais"
          ],
          title:
            "Disco Science"
        }
      ],

      providerSearches: [
        {
          provider:
            "musicbrainz",
          ok: true
        },
        {
          provider:
            "discogs",
          ok: true
        }
      ]
    });

  assert.equal(
    evidence.summary
      .preferredIndependentSources,
    2
  );

  assert.equal(
    evidence.summary
      .competingIndependentSources,
    0
  );
});

test("absence de résultat pour le rival n'est pas une preuve négative", () => {
  const evidence =
    buildResolutionEvidence({
      expected: {
        artists: [
          "Ken Hayakawa"
        ],
        competingArtists: [
          "Kei Hayakawa"
        ],
        title:
          "Ignition Key"
      },

      candidates: [
        {
          source:
            "discogs",
          artists: [
            "Ken Hayakawa"
          ],
          title:
            "Ignition Key"
        }
      ],

      providerSearches: [
        {
          provider:
            "discogs",
          ok: true
        },
        {
          provider:
            "musicbrainz",
          ok: true
        }
      ]
    });

  assert.equal(
    evidence.absence.length,
    1
  );

  assert.equal(
    evidence.absence[0]
      .conclusive,
    false
  );
});

test("une contradiction connue mono-source reste ambiguë", () => {
  const evidence =
    buildResolutionEvidence({
      expected: {
        artists: [
          "Ken Hayakawa"
        ],
        competingArtists: [
          "Kei Hayakawa"
        ],
        title:
          "Ignition Key"
      },

      candidates: [
        {
          source:
            "discogs",
          artists: [
            "Ken Hayakawa"
          ],
          title:
            "Ignition Key"
        }
      ]
    });

  const result =
    decideFromResolutionEvidence({
      evidence,

      ranking: {
        best: {
          score: 0.9968
        },

        gap: 0.58
      }
    });

  assert.equal(
    result.decision,
    "ambiguous"
  );
});

test("deux mauvais candidats sont rejetés", () => {
  const evidence =
    buildResolutionEvidence({
      expected: {
        artists: [
          "Kaiser (Italy)"
        ],
        title: "Medusa"
      }
    });

  const result =
    decideFromResolutionEvidence({
      evidence,

      ranking: {
        best: {
          score: 0.43
        },

        gap: 0
      }
    });

  assert.equal(
    result.decision,
    "rejected"
  );

  assert.equal(
    result.reason,
    "no_plausible_identity_match"
  );
});

test("une identité très forte et corroborée est acceptée", () => {
  const evidence =
    buildResolutionEvidence({
      expected: {
        artists: [
          "Mirwais"
        ],
        competingArtists: [
          "David Gravell"
        ],
        title:
          "Disco Science"
      },

      candidates: [
        {
          source:
            "musicbrainz",
          artists: [
            "Mirwais"
          ],
          title:
            "Disco Science"
        },
        {
          source:
            "discogs",
          artists: [
            "Mirwais"
          ],
          title:
            "Disco Science"
        }
      ]
    });

  const result =
    decideFromResolutionEvidence({
      evidence,

      ranking: {
        best: {
          score: 1
        },

        gap: 0.60
      }
    });

  assert.equal(
    result.decision,
    "auto_accept"
  );
});
