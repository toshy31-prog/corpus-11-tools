import test from "node:test";
import assert from "node:assert/strict";

import {
  textSimilarity,
  scoreTrackCandidate,
  rankTrackCandidates,
  decideTrackCandidate
} from "./track-candidate-score.mjs";

test("une graphie Unicode proche reste très similaire", () => {
  assert.ok(
    textSimilarity("PØLI", "POLI") > 0.95
  );

  assert.ok(
    textSimilarity("Múm", "Mum") > 0.95
  );
});

test("un candidat exact obtient un score très fort", () => {
  const result =
    scoreTrackCandidate(
      {
        artists: ["Pye Corner Audio"],
        title: "As We Begin",
        durationMs: 240000
      },
      {
        source: "musicbrainz",
        artists: ["Pye Corner Audio"],
        title: "As We Begin",
        durationMs: 240500
      }
    );

  assert.ok(result.score > 0.95);
});

test("un bon titre avec mauvais artiste est pénalisé", () => {
  const good =
    scoreTrackCandidate(
      {
        artists: ["Mirwais"],
        title: "Disco Science"
      },
      {
        source: "musicbrainz",
        artists: ["Mirwais"],
        title: "Disco Science"
      }
    );

  const bad =
    scoreTrackCandidate(
      {
        artists: ["Mirwais"],
        title: "Disco Science"
      },
      {
        source: "musicbrainz",
        artists: ["David Gravell"],
        title: "Disco Science"
      }
    );

  assert.ok(good.score > bad.score);
  assert.ok(
    bad.penalties.some(
      ({ type }) =>
        type === "artist_mismatch"
    )
  );
});

test("un code catalogue exact renforce le candidat", () => {
  const exact =
    scoreTrackCandidate(
      {
        artists: ["Pye Corner Audio"],
        title: "The Future",
        catalogueCode: "JG022"
      },
      {
        source: "discogs",
        artists: ["Pye Corner Audio"],
        title: "The Future",
        catalogueCode: "JG022"
      }
    );

  const wrong =
    scoreTrackCandidate(
      {
        artists: ["Pye Corner Audio"],
        title: "The Future",
        catalogueCode: "JG022"
      },
      {
        source: "discogs",
        artists: ["Pye Corner Audio"],
        title: "The Future",
        catalogueCode: "XYZ999"
      }
    );

  assert.ok(exact.score > wrong.score);
});

test("la durée peut départager deux candidats autrement similaires", () => {
  const ranking =
    rankTrackCandidates(
      {
        artists: ["Artist"],
        title: "Track",
        durationMs: 300000
      },
      [
        {
          id: "wrong",
          source: "musicbrainz",
          artists: ["Artist"],
          title: "Track",
          durationMs: 180000
        },
        {
          id: "right",
          source: "musicbrainz",
          artists: ["Artist"],
          title: "Track",
          durationMs: 301000
        }
      ]
    );

  assert.equal(
    ranking.best.candidate.id,
    "right"
  );
});

test("deux excellents candidats trop proches restent ambigus", () => {
  const result =
    decideTrackCandidate(
      {
        artists: ["Artist"],
        title: "Track"
      },
      [
        {
          id: "a",
          source: "musicbrainz",
          artists: ["Artist"],
          title: "Track"
        },
        {
          id: "b",
          source: "discogs",
          artists: ["Artist"],
          title: "Track"
        }
      ],
      {
        thresholds: {
          autoAcceptGap: 0.08,
          ambiguousGap: 0.05
        }
      }
    );

  assert.equal(
    result.decision,
    "ambiguous"
  );
});

test("un excellent candidat nettement devant peut être auto-accepté", () => {
  const result =
    decideTrackCandidate(
      {
        artists: ["PØLI"],
        title: "Metal Works",
        version: "Original Mix"
      },
      [
        {
          id: "correct",
          source: "musicbrainz",
          artists: ["PØLI"],
          title: "Metal Works",
          version: "Original Mix"
        },
        {
          id: "other",
          source: "discogs",
          artists: ["Another Artist"],
          title: "Metal Works"
        }
      ]
    );

  assert.equal(
    result.decision,
    "auto_accept"
  );

  assert.equal(
    result.best.candidate.id,
    "correct"
  );
});

test("aucun candidat retourne rejected", () => {
  const result =
    decideTrackCandidate(
      {
        artists: ["Artist"],
        title: "Track"
      },
      []
    );

  assert.equal(
    result.decision,
    "rejected"
  );

  assert.equal(
    result.reason,
    "no_candidates"
  );
});

test("une ambiguïté artiste déjà connue interdit l'auto-accept sur la seule ressemblance textuelle", () => {
  const result =
    decideTrackCandidate(
      {
        artists: ["Ken Hayakawa"],
        competingArtists: [
          "Kei Hayakawa"
        ],
        identityStatus: "unresolved",
        title: "Ignition Key",
        version: "Original Mix"
      },
      [
        {
          id: "mb-ken",
          source: "musicbrainz",
          artists: ["Ken Hayakawa"],
          title: "Ignition Key",
          version: "Original Mix"
        },
        {
          id: "discogs-kei",
          source: "discogs",
          artists: ["Kei Hayakawa"],
          title: "Ignition Key",
          version: "Original Mix"
        }
      ]
    );

  assert.equal(
    result.decision,
    "ambiguous"
  );

  assert.equal(
    result.reason,
    "known_input_identity_disagreement"
  );

  assert.deepEqual(
    result.knownAlternatives,
    ["Kei Hayakawa"]
  );
});

test("un catalogue exact peut départager une ambiguïté artiste connue", () => {
  const result =
    decideTrackCandidate(
      {
        artists: ["Artist A"],
        competingArtists: [
          "Artist B"
        ],
        title: "Track",
        catalogueCode: "CAT001"
      },
      [
        {
          id: "a",
          source: "discogs",
          artists: ["Artist A"],
          title: "Track",
          catalogueCode: "CAT001"
        },
        {
          id: "b",
          source: "musicbrainz",
          artists: ["Artist B"],
          title: "Track",
          catalogueCode: "OTHER"
        }
      ]
    );

  assert.notEqual(
    result.reason,
    "known_input_identity_disagreement"
  );

  assert.equal(
    result.best.candidate.id,
    "a"
  );
});

test("une version attendue absente chez le fournisseur reste inconnue et non contradictoire", () => {
  const result =
    scoreTrackCandidate(
      {
        artists: ["PØLI"],
        title: "Metal Works",
        version: "Original Mix"
      },
      {
        source: "musicbrainz",
        artists: ["PØLI"],
        title: "Metal Works",
        version: ""
      }
    );

  assert.equal(
    result.components.version,
    null
  );
});

test("des artistes supplémentaires sont visibles dans les pénalités", () => {
  const result =
    scoreTrackCandidate(
      {
        artists: ["PØLI"],
        title: "Metal Works"
      },
      {
        source: "musicbrainz",
        artists: [
          "PØLI",
          "Lorenzo Raganzini"
        ],
        title: "Metal Works"
      }
    );

  const penalty =
    result.penalties.find(
      ({ type }) =>
        type ===
        "additional_artist_credits"
    );

  assert.ok(penalty);

  assert.deepEqual(
    penalty.artists,
    ["Lorenzo Raganzini"]
  );

  assert.ok(result.score < 1);
});

test("deux candidats faibles ne deviennent pas ambigus uniquement parce que leurs scores sont proches", () => {
  const result =
    decideTrackCandidate(
      {
        artists: [
          "Kaiser (Italy)"
        ],
        title: "Medusa"
      },
      [
        {
          source: "musicbrainz",
          sourceId: "wrong-1",
          artists: ["Jivemind"],
          title: "Medusa"
        },
        {
          source: "musicbrainz",
          sourceId: "wrong-2",
          artists: ["Anthrax"],
          title: "Medusa"
        }
      ]
    );

  assert.equal(
    result.decision,
    "rejected"
  );

  assert.equal(
    result.reason,
    "no_plausible_identity_match"
  );
});
