import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  summarizeIdentityObservations,
  summarizeIdentityPackets
} from "../lib/evidence-algebra.mjs";

import {
  summarizeIdentitySupport
} from "../lib/multisource-decision.mjs";

test(
  "deux observations d'une même famille ne font qu'une source indépendante",
  () => {
    const support =
      summarizeIdentityObservations([
        {
          artist: "A",
          source: "mb-recording-1",
          sourceFamily: "musicbrainz",
          strength: 1
        },
        {
          artist: "A",
          source: "mb-recording-2",
          sourceFamily: "musicbrainz",
          strength: 0.98
        }
      ]);

    assert.equal(
      support.length,
      1
    );

    assert.equal(
      support[0].independentSources,
      1
    );

    assert.deepEqual(
      support[0].sourceFamilies,
      ["musicbrainz"]
    );

    assert.deepEqual(
      support[0].sources,
      [
        "mb-recording-1",
        "mb-recording-2"
      ]
    );
  }
);

test(
  "deux familles indépendantes corroborent réellement",
  () => {
    const support =
      summarizeIdentityObservations([
        {
          artist: "A",
          source: "youtube-topic",
          sourceFamily: "youtube",
          strength: 0.94
        },
        {
          artist: "A",
          source: "mb-recording",
          sourceFamily: "musicbrainz",
          strength: 1
        }
      ]);

    assert.equal(
      support[0].independentSources,
      2
    );

    assert.deepEqual(
      support[0].sourceFamilies,
      [
        "musicbrainz",
        "youtube"
      ]
    );
  }
);

test(
  "le bridge packet conserve le comportement multisource existant",
  () => {
    const packets = [
      {
        source: "youtube_local",
        observations: [
          {
            kind: "artist",
            value: "DA Uzi",
            role: "topic_header_credit",
            strength: 0.94
          }
        ]
      },
      {
        source: "musicbrainz",
        observations: [
          {
            kind: "artist",
            value: "DA Uzi",
            role: "provider_candidate",
            strength: 1
          }
        ]
      }
    ];

    assert.deepEqual(
      summarizeIdentitySupport(
        packets
      ),
      summarizeIdentityPackets(
        packets
      )
    );

    const support =
      summarizeIdentitySupport(
        packets
      );

    assert.equal(
      support[0].artist,
      "DA Uzi"
    );

    assert.equal(
      support[0].independentSources,
      2
    );
  }
);

test(
  "multisource-decision ne contient plus son propre agrégateur",
  () => {
    const source =
      fs.readFileSync(
        new URL(
          "../lib/multisource-decision.mjs",
          import.meta.url
        ),
        "utf8"
      );

    assert.equal(
      source.includes(
        "const byArtist = new Map()"
      ),
      false
    );

    assert.equal(
      source.includes(
        "summarizeIdentityPackets("
      ),
      true
    );
  }
);
