
import test from "node:test";
import assert from "node:assert/strict";

import {
  FACT_KINDS,
  ROLES,
  RELATIONS,
  makeFact,
  relationBetweenNames,
  summarizeEvidence,
  decideIdentity
} from "../lib/evidence-algebra.mjs";

test(
  "PØLI et POLI sont une variante orthographique, pas une fusion brute",
  () => {
    assert.equal(
      relationBetweenNames(
        "PØLI",
        "POLI"
      ),
      RELATIONS.ORTHOGRAPHIC_VARIANT
    );
  }
);

test(
  "un featuring n'est pas une identité primaire",
  () => {
    const summary =
      summarizeEvidence([
        makeFact({
          kind:
            FACT_KINDS.IDENTITY_CLAIM,
          subject: "A",
          role:
            ROLES.PRIMARY,
          source:
            "youtube",
          sourceFamily:
            "youtube",
          strength: 0.94
        }),
        makeFact({
          kind:
            FACT_KINDS.CREDIT_CLAIM,
          subject: "B",
          role:
            ROLES.FEATURING,
          source:
            "youtube",
          sourceFamily:
            "youtube",
          strength: 0.9
        })
      ]);

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

test(
  "deux occurrences d'une même source ne comptent qu'une fois",
  () => {
    const result =
      decideIdentity({
        expected: ["A"],
        facts: [
          makeFact({
            kind:
              FACT_KINDS.IDENTITY_CLAIM,
            subject: "A",
            role:
              ROLES.PRIMARY,
            source:
              "musicbrainz-recording-1",
            sourceFamily:
              "musicbrainz",
            strength: 1
          }),
          makeFact({
            kind:
              FACT_KINDS.IDENTITY_CLAIM,
            subject: "A",
            role:
              ROLES.PRIMARY,
            source:
              "musicbrainz-recording-2",
            sourceFamily:
              "musicbrainz",
            strength: 0.99
          })
        ]
      });

    assert.equal(
      result.preferred.independentSourceCount,
      1
    );

    assert.deepEqual(
      result.preferred.sourceFamilies,
      ["musicbrainz"]
    );

    assert.equal(
      result.decision,
      "accepted"
    );

    assert.equal(
      result.reason,
      "strong_single_source_without_known_competitor"
    );
  }
);

test(
  "youtube + musicbrainz corroborent une identité",
  () => {
    const result =
      decideIdentity({
        expected: ["DA Uzi"],
        competing: ["DA"],
        facts: [
          makeFact({
            kind:
              FACT_KINDS.IDENTITY_CLAIM,
            subject: "DA Uzi",
            role:
              ROLES.PRIMARY,
            source:
              "youtube_topic_header",
            sourceFamily:
              "youtube",
            strength: 0.94
          }),
          makeFact({
            kind:
              FACT_KINDS.IDENTITY_CLAIM,
            subject: "DA Uzi",
            role:
              ROLES.PRIMARY,
            source:
              "musicbrainz_recording",
            sourceFamily:
              "musicbrainz",
            strength: 1
          }),
          makeFact({
            kind:
              FACT_KINDS.CREDIT_CLAIM,
            subject: "DA",
            role:
              ROLES.CHANNEL_HINT,
            source:
              "youtube_topic_channel",
            sourceFamily:
              "youtube",
            strength: 0.68
          })
        ]
      });

    assert.equal(
      result.decision,
      "accepted"
    );
  }
);
