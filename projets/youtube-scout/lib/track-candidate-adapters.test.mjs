import test from "node:test";
import assert from "node:assert/strict";

import {
  adaptMusicBrainzRecording,
  adaptMusicBrainzResponse,
  adaptDiscogsCandidate,
  adaptDiscogsResponse,
  collectTrackCandidates
} from "./track-candidate-adapters.mjs";

import {
  decideTrackCandidate
} from "./track-candidate-score.mjs";

test("MusicBrainz devient un candidat normalisé sans perdre ses IDs", () => {
  const candidate =
    adaptMusicBrainzRecording({
      id: "rec-1",
      title:
        "Metal Works (Original Mix)",
      length: 367000,
      score: 100,

      "artist-credit": [
        {
          name: "PØLI",
          artist: {
            id: "artist-poli",
            name: "PØLI"
          }
        }
      ],

      releases: [
        {
          id: "release-1",
          "label-info": [
            {
              "catalog-number": "CAT001",
              label: {
                id: "label-1",
                name: "Label"
              }
            }
          ]
        }
      ]
    });

  assert.equal(
    candidate.source,
    "musicbrainz"
  );

  assert.equal(
    candidate.sourceId,
    "rec-1"
  );

  assert.deepEqual(
    candidate.artists,
    ["PØLI"]
  );

  assert.equal(
    candidate.title,
    "Metal Works"
  );

  assert.equal(
    candidate.version,
    "Original Mix"
  );

  assert.equal(
    candidate.catalogueCode,
    "CAT001"
  );

  assert.equal(
    candidate.durationMs,
    367000
  );

  assert.deepEqual(
    candidate.evidence.artistIds,
    ["artist-poli"]
  );

  assert.deepEqual(
    candidate.evidence.releaseIds,
    ["release-1"]
  );
});

test("MusicBrainz ignore les résultats incomplets plutôt que d'inventer", () => {
  const candidates =
    adaptMusicBrainzResponse({
      recordings: [
        {
          id: "good",
          title: "Track",
          "artist-credit": [
            {
              artist: {
                id: "a",
                name: "Artist"
              }
            }
          ]
        },
        {
          id: "no-artist",
          title: "Track",
          "artist-credit": []
        }
      ]
    });

  assert.deepEqual(
    candidates.map(({ sourceId }) => sourceId),
    ["good"]
  );
});

test("Discogs adapte un résultat de recherche Artist - Track", () => {
  const candidate =
    adaptDiscogsCandidate({
      id: 42,
      master_id: 99,
      title:
        "Pye Corner Audio - The Future",
      catno: "JG022",
      resource_url:
        "https://api.discogs.com/releases/42"
    });

  assert.deepEqual(
    candidate.artists,
    ["Pye Corner Audio"]
  );

  assert.equal(
    candidate.title,
    "The Future"
  );

  assert.equal(
    candidate.catalogueCode,
    "JG022"
  );

  assert.equal(
    candidate.evidence.releaseId,
    "42"
  );

  assert.equal(
    candidate.evidence.masterId,
    "99"
  );
});

test("Discogs conserve artistes structurés, version et durée", () => {
  const candidate =
    adaptDiscogsCandidate({
      id: 50,
      trackTitle:
        "Raval (Earth Trax Remix)",

      artists: [
        {
          id: 7,
          name: "Wayward"
        }
      ],

      duration: "6:31",

      labels: [
        {
          id: 12,
          name: "Silver Bear",
          catno: "SB001"
        }
      ]
    });

  assert.deepEqual(
    candidate.artists,
    ["Wayward"]
  );

  assert.equal(
    candidate.title,
    "Raval"
  );

  assert.equal(
    candidate.version,
    "Earth Trax Remix"
  );

  assert.equal(
    candidate.durationMs,
    391000
  );

  assert.equal(
    candidate.catalogueCode,
    "SB001"
  );
});

test("les sources restent séparées lors de la collecte", () => {
  const candidates =
    collectTrackCandidates({
      musicbrainz: {
        recordings: [
          {
            id: "mb1",
            title: "Track",
            "artist-credit": [
              {
                artist: {
                  id: "mba",
                  name: "Artist"
                }
              }
            ]
          }
        ]
      },

      discogs: {
        results: [
          {
            id: 123,
            title: "Artist - Track"
          }
        ]
      }
    });

  assert.equal(
    candidates.length,
    2
  );

  assert.deepEqual(
    candidates.map(({ source }) => source),
    [
      "musicbrainz",
      "discogs"
    ]
  );
});

test("Discogs ignore un résultat sans artiste exploitable", () => {
  const result =
    adaptDiscogsResponse({
      results: [
        {
          id: 1,
          title: "Pas de frontière"
        }
      ]
    });

  assert.deepEqual(result, []);
});

test("les adaptateurs alimentent directement le scorer sans résoudre eux-mêmes", () => {
  const candidates =
    collectTrackCandidates({
      musicbrainz: {
        recordings: [
          {
            id: "ken",
            title:
              "Ignition Key (Original Mix)",
            "artist-credit": [
              {
                artist: {
                  id: "ken-id",
                  name: "Ken Hayakawa"
                }
              }
            ]
          }
        ]
      },

      discogs: {
        results: [
          {
            id: 555,
            title:
              "Kei Hayakawa - Ignition Key (Original Mix)"
          }
        ]
      }
    });

  const result =
    decideTrackCandidate(
      {
        artists: ["Ken Hayakawa"],
        competingArtists: [
          "Kei Hayakawa"
        ],
        title: "Ignition Key",
        version: "Original Mix",
        identityStatus: "unresolved"
      },
      candidates
    );

  assert.equal(
    result.decision,
    "ambiguous"
  );

  assert.equal(
    result.reason,
    "known_input_identity_disagreement"
  );
});
