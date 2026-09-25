import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  candidateSupportsIdentity,
  summarizeExternalIdentitySupport
} from "../lib/evidence-algebra.mjs";

const normalize = (value = "") =>
  String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

const similarity = (a, b) =>
  normalize(a) === normalize(b)
    ? 1
    : 0;

test(
  "candidateSupportsIdentity reconnaît un artiste exact normalisé",
  () => {
    assert.equal(
      candidateSupportsIdentity(
        {
          artists: ["DA Uzi"]
        },
        "DA Uzi",
        {
          normalizeName: normalize,
          similarity
        }
      ),
      true
    );
  }
);

test(
  "le support externe compte les familles indépendantes",
  () => {
    const support =
      summarizeExternalIdentitySupport({
        candidates: [
          {
            source: "mb-1",
            sourceFamily: "musicbrainz",
            artists: ["DA Uzi"],
            title: "Amour Pouvoir Intelligence"
          },
          {
            source: "mb-2",
            sourceFamily: "musicbrainz",
            artists: ["DA Uzi"],
            title: "Amour Pouvoir Intelligence"
          },
          {
            source: "discogs",
            sourceFamily: "discogs",
            artists: ["DA Uzi"],
            title: "Amour Pouvoir Intelligence"
          }
        ],
        expectedArtists: ["DA Uzi"],
        competingArtists: ["DA"],
        expectedTitle: "Amour Pouvoir Intelligence",
        normalizeName: normalize,
        similarity,
        minimumArtistSimilarity: 0.92,
        minimumTitleSimilarity: 0.92
      });

    const preferred =
      support.find(
        ({ artist }) =>
          artist === "DA Uzi"
      );

    assert.ok(preferred);

    assert.equal(
      preferred.independentSources,
      2
    );

    assert.deepEqual(
      preferred.sourceFamilies,
      [
        "discogs",
        "musicbrainz"
      ]
    );
  }
);

test(
  "absence de candidat rival ne crée aucune preuve négative",
  () => {
    const support =
      summarizeExternalIdentitySupport({
        candidates: [
          {
            source: "musicbrainz",
            artists: ["DA Uzi"],
            title: "Amour Pouvoir Intelligence"
          }
        ],
        expectedArtists: ["DA Uzi"],
        competingArtists: ["DA"],
        expectedTitle: "Amour Pouvoir Intelligence",
        normalizeName: normalize,
        similarity
      });

    const rival =
      support.find(
        ({ artist }) =>
          artist === "DA"
      );

    assert.ok(rival);
    assert.equal(
      rival.independentSources,
      0
    );
    assert.deepEqual(
      rival.candidates,
      []
    );
  }
);

test(
  "le live engine n'embarque plus candidateSupportsArtist",
  () => {
    const source =
      fs.readFileSync(
        new URL(
          "../scripts/live-track-resolution-engine.mjs",
          import.meta.url
        ),
        "utf8"
      );

    assert.equal(
      source.includes(
        "function candidateSupportsArtist("
      ),
      false
    );

    assert.equal(
      source.includes(
        "summarizeExternalIdentitySupport("
      ),
      true
    );

    assert.equal(
      source.includes(
        "function applyLiveEvidenceGate("
      ),
      true
    );
  }
);
