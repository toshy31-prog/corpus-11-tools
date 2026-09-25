import test from "node:test";
import assert from "node:assert/strict";

import {
  decideRuntimeRecording,
  acceptedMusicBrainzId
} from "./recording-resolution-decision.mjs";

function plan({
  artist = "Dot Allison",
  title = "Substance",
  version = "Felix da Housecat Remix",
  issues = []
} = {}) {
  return {
    durationMs: null,
    projection: {
      interpreted: {
        preferredArtists: [
          {
            name: artist,
            sources: ["runtime_artist"]
          }
        ],
        title,
        version,
        catalogueCode: "",
        identityStatus: "unresolved",
        issues
      }
    }
  };
}

test("la décision runtime moderne accepte un recording MB exact", () => {
  const result = decideRuntimeRecording({
    plan: plan(),
    musicBrainzCandidates: [
      {
        id: "recording-dot",
        title:
          "Substance (Felix da Housecat Remix)",
        sourceScore: 83,
        artistCredits: [
          {
            id: "artist-dot",
            name: "Dot Allison"
          }
        ],
        releases: [],
        isrcs: []
      }
    ],
    discogsCandidates: []
  });

  assert.equal(
    result.decision.decision,
    "auto_accept"
  );

  assert.equal(
    acceptedMusicBrainzId(result),
    "recording-dot"
  );
});

test("un candidat artiste incompatible n'est jamais accepté", () => {
  const result = decideRuntimeRecording({
    plan: plan(),
    musicBrainzCandidates: [
      {
        id: "wrong",
        title:
          "Substance (Felix da Housecat Remix)",
        sourceScore: 100,
        artistCredits: [
          {
            id: "wrong-artist",
            name: "Another Artist"
          }
        ],
        releases: [],
        isrcs: []
      }
    ]
  });

  assert.notEqual(
    acceptedMusicBrainzId(result),
    "wrong"
  );
});

test("une compétition connue empêche une auto-acceptation mono-source", () => {
  const result = decideRuntimeRecording({
    plan: plan({
      artist: "DA Uzi",
      title: "Amour Pouvoir Intelligence",
      version: "",
      issues: [
        {
          type: "topic_channel_disagreement",
          channelCandidate: "DA"
        }
      ]
    }),
    musicBrainzCandidates: [
      {
        id: "mb-da-uzi",
        title: "Amour Pouvoir Intelligence",
        sourceScore: 100,
        artistCredits: [
          {
            id: "artist-da-uzi",
            name: "DA Uzi"
          }
        ],
        releases: [],
        isrcs: []
      }
    ]
  });

  assert.equal(
    result.decision.decision,
    "ambiguous"
  );

  assert.equal(
    result.decision.reason,
    "known_identity_disagreement_requires_corroboration"
  );
});

import {
  applyRuntimeRecordingAuthority
} from "./recording-resolution-decision.mjs";

function legacyResolved(id = "recording-dot") {
  return {
    type: "recording",
    parsed: {
      status: "parsed",
      artist: "Dot Allison",
      title: "Substance",
      mix: "Felix da Housecat Remix"
    },
    status: "resolved",
    resolved: {
      id,
      title: "Substance (Felix da Housecat Remix)"
    },
    candidates: [
      {
        id,
        accepted: true
      }
    ],
    discogsCandidates: [],
    evidence: [
      {
        source: "musicbrainz",
        basis: "exact_artist_title_duration",
        id
      }
    ],
    corroboration: {
      musicbrainz: "resolved",
      discogs: "none",
      bandcamp: "none"
    },
    sourceStates: {
      musicbrainz: "candidates",
      discogs: "not_configured"
    }
  };
}

test("l'autorité runtime conserve resolved si le MBID accepté correspond exactement", () => {
  const runtime = decideRuntimeRecording({
    plan: plan(),
    musicBrainzCandidates: [
      {
        id: "recording-dot",
        title:
          "Substance (Felix da Housecat Remix)",
        sourceScore: 100,
        artistCredits: [
          {
            id: "artist-dot",
            name: "Dot Allison"
          }
        ],
        releases: [],
        isrcs: []
      }
    ]
  });

  const result =
    applyRuntimeRecordingAuthority(
      legacyResolved("recording-dot"),
      runtime
    );

  assert.equal(result.status, "resolved");
  assert.equal(
    result.resolved.id,
    "recording-dot"
  );
});

test("l'autorité runtime retire resolved si l'algèbre refuse le candidat", () => {
  const runtime = decideRuntimeRecording({
    plan: plan(),
    musicBrainzCandidates: [
      {
        id: "wrong",
        title:
          "Substance (Felix da Housecat Remix)",
        sourceScore: 100,
        artistCredits: [
          {
            id: "wrong-artist",
            name: "Another Artist"
          }
        ],
        releases: [],
        isrcs: []
      }
    ]
  });

  const result =
    applyRuntimeRecordingAuthority(
      legacyResolved("wrong"),
      runtime
    );

  assert.notEqual(result.status, "resolved");
  assert.equal(result.resolved, null);

  assert.equal(
    result.evidence.some(
      (item) =>
        item.source === "musicbrainz" &&
        item.basis ===
          "exact_artist_title_duration"
    ),
    false
  );
});

test("une ambiguïté moderne interdit à l'ancien moteur de réélever en resolved", () => {
  const runtime = decideRuntimeRecording({
    plan: plan({
      artist: "DA Uzi",
      title: "Amour Pouvoir Intelligence",
      version: "",
      issues: [
        {
          type:
            "topic_channel_disagreement",
          channelCandidate: "DA"
        }
      ]
    }),
    musicBrainzCandidates: [
      {
        id: "mb-da-uzi",
        title:
          "Amour Pouvoir Intelligence",
        sourceScore: 100,
        artistCredits: [
          {
            id: "artist-da-uzi",
            name: "DA Uzi"
          }
        ],
        releases: [],
        isrcs: []
      }
    ]
  });

  const legacy = {
    ...legacyResolved("mb-da-uzi"),
    parsed: {
      status: "parsed",
      artist: "DA Uzi",
      title: "Amour Pouvoir Intelligence",
      mix: ""
    }
  };

  const result =
    applyRuntimeRecordingAuthority(
      legacy,
      runtime
    );

  assert.equal(result.status, "ambiguous");
  assert.equal(result.resolved, null);
  assert.equal(
    result.corroboration.musicbrainz,
    "ambiguous"
  );
});

test("le contrat historique Discogs reste intact quand resolved est retiré", () => {
  const runtime = {
    decision: {
      decision: "ambiguous",
      reason:
        "known_identity_disagreement_requires_corroboration"
    }
  };

  const legacy = {
    ...legacyResolved("x"),
    discogsCandidates: [
      {
        id: 77,
        catalogueNumber: "MNT 77",
        baseCorroborates: true,
        corroborates: false
      }
    ],
    corroboration: {
      musicbrainz: "resolved",
      discogs: "base_catalogue_match",
      bandcamp: "none"
    }
  };

  const result =
    applyRuntimeRecordingAuthority(
      legacy,
      runtime
    );

  assert.equal(
    result.discogsCandidates[0]
      .catalogueNumber,
    "MNT 77"
  );
  assert.equal(
    result.corroboration.discogs,
    "base_catalogue_match"
  );
});

test("une release Discogs de recherche non hydratée ne rend pas ambigu un recording MB exact", () => {
  const result = decideRuntimeRecording({
    plan: plan(),
    musicBrainzCandidates: [
      {
        id: "recording-dot",
        title: "Substance (Felix da Housecat Remix)",
        sourceScore: 83,
        artistCredits: [
          {
            id: "artist-dot",
            name: "Dot Allison"
          }
        ],
        releases: [],
        isrcs: []
      }
    ],
    discogsCandidates: [
      {
        id: 77,
        title: "Dot Allison - Substance",
        year: 2002,
        labels: ["Mantra"],
        formats: ['12"'],
        catalogueNumber: "MNT 77",
        discogsUrl: "https://www.discogs.com/release/77"
      }
    ]
  });

  assert.equal(
    result.decision.decision,
    "auto_accept"
  );

  assert.equal(
    acceptedMusicBrainzId(result),
    "recording-dot"
  );

  assert.equal(
    result.candidates.some(
      candidate =>
        candidate.source === "discogs"
    ),
    false
  );

  assert.equal(
    result.unhydratedDiscogsCandidates.length,
    1
  );
});

test("une release Discogs de recherche seule ne peut pas auto-résoudre un recording", () => {
  const result = decideRuntimeRecording({
    plan: plan(),
    musicBrainzCandidates: [],
    discogsCandidates: [
      {
        id: 77,
        title: "Dot Allison - Substance",
        year: 2002,
        labels: ["Mantra"],
        formats: ['12"'],
        catalogueNumber: "MNT 77"
      }
    ]
  });

  assert.equal(
    result.decision.decision,
    "rejected"
  );

  assert.equal(
    acceptedMusicBrainzId(result),
    ""
  );

  assert.equal(
    result.unhydratedDiscogsCandidates.length,
    1
  );
});
