import test from "node:test";
import assert from "node:assert/strict";

import {
  adaptDiscogsReleaseTracks
} from "./discogs-track-candidates.mjs";

test("une release Discogs produit ses vraies pistes et non son titre de release", () => {
  const tracks =
    adaptDiscogsReleaseTracks({
      id: 11796519,
      master_id: 123,
      title: "Definition Of Silence",

      artists: [
        {
          id: 10,
          name: "Ken Hayakawa"
        }
      ],

      labels: [
        {
          id: 55,
          name: "Label",
          catno: "LET027"
        }
      ],

      tracklist: [
        {
          position: "A1",
          title: "Ignition Key",
          duration: "6:52"
        },
        {
          position: "A2",
          title: "Another Track",
          duration: "5:00"
        }
      ]
    });

  assert.equal(tracks.length, 2);

  assert.equal(
    tracks[0].title,
    "Ignition Key"
  );

  assert.deepEqual(
    tracks[0].artists,
    ["Ken Hayakawa"]
  );

  assert.equal(
    tracks[0].catalogueCode,
    "LET027"
  );

  assert.equal(
    tracks[0].durationMs,
    412000
  );

  assert.equal(
    tracks[0].evidence.releaseTitle,
    "Definition Of Silence"
  );
});

test("un artiste propre à la piste remplace l'artiste global de release", () => {
  const [track] =
    adaptDiscogsReleaseTracks({
      id: 1,

      artists: [
        {
          id: 10,
          name: "Various"
        }
      ],

      tracklist: [
        {
          position: "B1",
          title: "Track",
          artists: [
            {
              id: 20,
              name: "Actual Artist"
            }
          ]
        }
      ]
    });

  assert.deepEqual(
    track.artists,
    ["Actual Artist"]
  );
});

test("les headings Discogs ne deviennent pas des morceaux", () => {
  const tracks =
    adaptDiscogsReleaseTracks({
      id: 1,
      artists: [
        {
          id: 2,
          name: "Artist"
        }
      ],
      tracklist: [
        {
          type_: "heading",
          title: "Side A"
        },
        {
          type_: "track",
          position: "A1",
          title: "Real Track"
        }
      ]
    });

  assert.deepEqual(
    tracks.map(({ title }) => title),
    ["Real Track"]
  );
});
