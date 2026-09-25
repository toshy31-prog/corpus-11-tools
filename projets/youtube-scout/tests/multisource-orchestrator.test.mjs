import test from "node:test";
import assert from "node:assert/strict";

import {
  createSourceRegistry
} from "../lib/multisource-source-registry.mjs";

import {
  resolveWithSources
} from "../lib/multisource-resolution-orchestrator.mjs";

test(
  "l'orchestrateur s'arrête quand deux sources corroborent",
  async () => {
    const registry =
      createSourceRegistry();

    registry
      .register({
        id: "youtube_local",
        priority: 10,
        async resolve() {
          return {
            observations: [
              {
                kind: "artist",
                value: "Mirwais",
                strength: 0.94
              }
            ]
          };
        }
      })
      .register({
        id: "musicbrainz",
        priority: 20,
        async resolve() {
          return {
            observations: [
              {
                kind: "artist",
                value: "Mirwais",
                strength: 1
              }
            ]
          };
        }
      })
      .register({
        id: "discogs",
        priority: 30,
        async resolve() {
          throw new Error(
            "ne devrait pas être appelé"
          );
        }
      });

    const result =
      await resolveWithSources({
        registry,
        input: {
          title: "Disco Science"
        },
        expectedArtists: [
          "Mirwais"
        ],
        competingArtists: [
          "David Gravell"
        ]
      });

    assert.equal(
      result.decision.decision,
      "accepted"
    );

    assert.deepEqual(
      result.sourceRuns.map(
        ({ source }) => source
      ),
      [
        "youtube_local",
        "musicbrainz"
      ]
    );
  }
);
