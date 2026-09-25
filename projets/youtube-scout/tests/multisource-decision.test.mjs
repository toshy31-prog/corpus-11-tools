import test from "node:test";
import assert from "node:assert/strict";

import {
  decideMultiSourceIdentity
} from "../lib/multisource-decision.mjs";

test(
  "deux sources indépendantes permettent une acceptation",
  () => {
    const result =
      decideMultiSourceIdentity({
        expectedArtists: ["Mirwais"],
        competingArtists: ["David Gravell"],
        evidencePackets: [
          {
            source: "youtube",
            observations: [
              {
                kind: "artist",
                value: "Mirwais",
                strength: 0.94
              }
            ]
          },
          {
            source: "musicbrainz",
            observations: [
              {
                kind: "artist",
                value: "Mirwais",
                strength: 1
              }
            ]
          }
        ]
      });

    assert.equal(
      result.decision,
      "accepted"
    );
  }
);

test(
  "une identité préférée mono-source avec concurrent connu reste ambiguë",
  () => {
    const result =
      decideMultiSourceIdentity({
        expectedArtists: ["Ken Hayakawa"],
        competingArtists: ["Kei Hayakawa"],
        evidencePackets: [
          {
            source: "discogs",
            observations: [
              {
                kind: "artist",
                value: "Ken Hayakawa",
                strength: 0.996
              }
            ]
          }
        ]
      });

    assert.equal(
      result.decision,
      "ambiguous"
    );
  }
);
