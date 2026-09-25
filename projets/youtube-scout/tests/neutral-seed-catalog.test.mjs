import test from "node:test";
import assert from "node:assert/strict";
import { buildSeedCatalog, rankSeedChoices } from "../lib/exploration.mjs";

function graph(entities, edges) {
  return {
    entities: Object.fromEntries(entities.map((e) => [e.id, e])),
    edges: Object.fromEntries(edges.map((e, i) => [e.id || `e${i}`, { id: e.id || `e${i}`, ...e }]))
  };
}

test("relationCount n'est plus une autorité de classement", () => {
  const state = graph(
    [
      { id: "video:youtube:z", type: "video", title: "Zulu" },
      { id: "video:youtube:a", type: "video", title: "Alpha" },
      { id: "playlist:p", type: "playlist", name: "P" },
      { id: "artist:x1", type: "artist", name: "X1" },
      { id: "artist:x2", type: "artist", name: "X2" }
    ],
    [
      { from: "video:youtube:z", to: "playlist:p", kind: "included_in" },
      { from: "video:youtube:z", to: "artist:x1", kind: "probable_artist" },
      { from: "video:youtube:z", to: "artist:x2", kind: "probable_artist" },
      { from: "video:youtube:a", to: "playlist:p", kind: "included_in" }
    ]
  );
  const catalog = buildSeedCatalog(state);
  assert.equal(catalog.track[0].label, "Alpha");
});

test("même nom sans preuve d'équivalence reste deux choix", () => {
  const state = graph(
    [
      { id: "artist:a", type: "artist", name: "Bigfoot" },
      { id: "artist:b", type: "artist", name: "Bigfoot" },
      { id: "label:x", type: "label", name: "X" },
      { id: "label:y", type: "label", name: "Y" }
    ],
    [
      { from: "artist:a", to: "label:x", kind: "associated_label" },
      { from: "artist:b", to: "label:y", kind: "associated_label" }
    ]
  );
  assert.equal(buildSeedCatalog(state).artist.filter((x) => x.label === "Bigfoot").length, 2);
});

test("external id partagé regroupe une identité technique", () => {
  const state = graph(
    [
      { id: "mbid:one", type: "artist", name: "Artist One", externalIds: { musicbrainz: "one" } },
      { id: "artist:musicbrainz:one", type: "artist", name: "Artist One", externalIds: { musicbrainz: "one" } },
      { id: "label:x", type: "label", name: "X" }
    ],
    [
      { from: "mbid:one", to: "label:x", kind: "associated_label" },
      { from: "artist:musicbrainz:one", to: "label:x", kind: "associated_label" }
    ]
  );
  const rows = buildSeedCatalog(state).artist.filter((x) => x.label === "Artist One");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].memberIds.length, 2);
});

test("same_identity confirmée regroupe", () => {
  const state = graph(
    [
      { id: "artist:a", type: "artist", name: "KAS:ST" },
      { id: "artist:b", type: "artist", name: "Kas:st" },
      { id: "label:x", type: "label", name: "X" }
    ],
    [
      {
        from: "artist:a",
        to: "artist:b",
        kind: "same_identity",
        status: "confirmed_cross_id"
      },
      { from: "artist:a", to: "label:x", kind: "associated_label" },
      { from: "artist:b", to: "label:x", kind: "associated_label" }
    ]
  );

  assert.equal(buildSeedCatalog(state).artist.length, 1);
});

test("recherche exact > préfixe > occurrence", () => {
  const rows = [
    { id: "1", label: "Black Noise", relationCount: 99 },
    { id: "2", label: "Black Noise Remix", relationCount: 1 },
    { id: "3", label: "The Black Noise Archive", relationCount: 500 }
  ];
  assert.deepEqual(rankSeedChoices(rows, "black noise").map((x) => x.id), ["1", "2", "3"]);
});

test("Kosh n'est pas promu par sa densité seule", () => {
  assert.deepEqual(
    rankSeedChoices([
      { id: "kosh", label: "Kosh", relationCount: 1000 },
      { id: "alpha", label: "Alpha", relationCount: 1 }
    ], "").map((x) => x.id),
    ["alpha", "kosh"]
  );
});

test("un candidat artiste Discogs issu seulement d'une recherche de nom ne devient pas une seed", () => {
  const state = graph(
    [
      { id: "video:youtube:kosh", type: "video", title: "Kosh - Black Noise" },
      {
        id: "artist:discogs:15790",
        type: "artist",
        name: "Kosh",
        externalIds: { discogs: "15790" }
      }
    ],
    [
      {
        from: "video:youtube:kosh",
        to: "artist:discogs:15790",
        kind: "probable_artist",
        status: "candidate"
      }
    ]
  );

  assert.equal(
    buildSeedCatalog(state).artist.some((seed) =>
      seed.memberIds.includes("artist:discogs:15790")
    ),
    false
  );
});

test("une hypothèse artiste locale issue seulement du titre ne devient pas une seed", () => {
  const state = graph(
    [
      {
        id: "video:youtube:noisy",
        type: "video",
        title: "[Conscient Industry 01] B2. Mis Gato - XuB"
      },
      {
        id: "local:conscientindustry01b2misgato",
        type: "artist",
        name: "[Conscient Industry 01] B2. Mis Gato"
      }
    ],
    [
      {
        from: "video:youtube:noisy",
        to: "local:conscientindustry01b2misgato",
        kind: "probable_artist",
        status: "unresolved"
      }
    ]
  );

  assert.equal(
    buildSeedCatalog(state).artist.some((seed) =>
      seed.memberIds.includes("local:conscientindustry01b2misgato")
    ),
    false
  );
});

test("une identité artiste structurée réellement reliée reste une seed", () => {
  const state = graph(
    [
      {
        id: "artist:musicbrainz:kosh",
        type: "artist",
        name: "Kosh",
        externalIds: { musicbrainz: "kosh" }
      },
      {
        id: "recording:musicbrainz:black-noise",
        type: "recording",
        title: "Black Noise"
      }
    ],
    [
      {
        from: "artist:musicbrainz:kosh",
        to: "recording:musicbrainz:black-noise",
        kind: "credited_on",
        status: "observed"
      }
    ]
  );

  assert.equal(
    buildSeedCatalog(state).artist.some((seed) =>
      seed.memberIds.includes("artist:musicbrainz:kosh")
    ),
    true
  );
});

test("[no label] n'est jamais proposé comme seed label", () => {
  const state = graph(
    [
      {
        id: "label:musicbrainz:technical",
        type: "label",
        name: "[no label]",
        externalIds: { musicbrainz: "technical" }
      },
      {
        id: "release:x",
        type: "release",
        title: "Release"
      }
    ],
    [
      {
        from: "release:x",
        to: "label:musicbrainz:technical",
        kind: "issued_by",
        status: "observed"
      }
    ]
  );

  assert.equal(buildSeedCatalog(state).label.length, 0);
});

test("deux labels de même nom sans preuve d'identité restent distincts", () => {
  const state = graph(
    [
      { id: "label:discogs:1", type: "label", name: "Astral Tek", externalIds: { discogs: "1" } },
      { id: "label:musicbrainz:2", type: "label", name: "Astral Tek", externalIds: { musicbrainz: "2" } },
      { id: "release:a", type: "release", title: "A" },
      { id: "release:b", type: "release", title: "B" }
    ],
    [
      { from: "release:a", to: "label:discogs:1", kind: "issued_by", status: "observed" },
      { from: "release:b", to: "label:musicbrainz:2", kind: "issued_by", status: "observed" }
    ]
  );

  assert.equal(
    buildSeedCatalog(state).label.filter((seed) => seed.label === "Astral Tek").length,
    2
  );
});

test("un placeholder de label Discogs et son ID réel se regroupent s'ils partagent la même release", () => {
  const state = graph(
    [
      { id: "release:discogs:123", type: "release", name: "Release X" },
      { id: "label:discogs-name:astral-tek", type: "label", name: "Astral Tek" },
      {
        id: "label:discogs:42186",
        type: "label",
        name: "Astral Tek",
        externalIds: { discogs: "42186" }
      }
    ],
    [
      {
        from: "release:discogs:123",
        to: "label:discogs-name:astral-tek",
        kind: "issued_by",
        status: "observed"
      },
      {
        from: "release:discogs:123",
        to: "label:discogs:42186",
        kind: "issued_by",
        status: "observed"
      }
    ]
  );

  const rows = buildSeedCatalog(state).label.filter(
    (seed) => seed.label === "Astral Tek"
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0].memberIds.length, 2);
});

test("deux labels Discogs de même nom sans release commune restent distincts", () => {
  const state = graph(
    [
      { id: "release:discogs:1", type: "release", name: "Release A" },
      { id: "release:discogs:2", type: "release", name: "Release B" },
      { id: "label:discogs-name:same-name", type: "label", name: "Same Name" },
      {
        id: "label:discogs:999",
        type: "label",
        name: "Same Name",
        externalIds: { discogs: "999" }
      }
    ],
    [
      {
        from: "release:discogs:1",
        to: "label:discogs-name:same-name",
        kind: "issued_by",
        status: "observed"
      },
      {
        from: "release:discogs:2",
        to: "label:discogs:999",
        kind: "issued_by",
        status: "observed"
      }
    ]
  );

  const rows = buildSeedCatalog(state).label.filter(
    (seed) => seed.label === "Same Name"
  );

  assert.equal(rows.length, 2);
});

test("une release Discogs portant plusieurs labels ne fusionne pas leurs identités", () => {
  const state = graph(
    [
      { id: "release:discogs:multi", type: "release", name: "Multi Label Release" },

      {
        id: "label:discogs-name:astral-tek",
        type: "label",
        name: "Astral Tek"
      },
      {
        id: "label:discogs:42186",
        type: "label",
        name: "Astral Tek",
        externalIds: { discogs: "42186" }
      },

      {
        id: "label:discogs-name:toolbox-records",
        type: "label",
        name: "Toolbox Records"
      },
      {
        id: "label:discogs-name:lxrecords",
        type: "label",
        name: "LXRecords"
      }
    ],
    [
      {
        from: "release:discogs:multi",
        to: "label:discogs-name:astral-tek",
        kind: "issued_by",
        status: "observed"
      },
      {
        from: "release:discogs:multi",
        to: "label:discogs:42186",
        kind: "issued_by",
        status: "observed"
      },
      {
        from: "release:discogs:multi",
        to: "label:discogs-name:toolbox-records",
        kind: "issued_by",
        status: "observed"
      },
      {
        from: "release:discogs:multi",
        to: "label:discogs-name:lxrecords",
        kind: "issued_by",
        status: "observed"
      }
    ]
  );

  const labels = buildSeedCatalog(state).label;

  const astral = labels.filter(x => x.label === "Astral Tek");
  assert.equal(astral.length, 1);

  assert.deepEqual(
    [...astral[0].memberIds].sort(),
    [
      "label:discogs-name:astral-tek",
      "label:discogs:42186"
    ].sort()
  );

  assert.ok(labels.some(x => x.label === "Toolbox Records"));
  assert.ok(labels.some(x => x.label === "LXRecords"));

  assert.ok(
    !astral[0].memberIds.includes("label:discogs-name:toolbox-records")
  );
  assert.ok(
    !astral[0].memberIds.includes("label:discogs-name:lxrecords")
  );
});

test("un placeholder de label MusicBrainz rejoint son MBID sur une même sortie corroborée", () => {
  const state = graph(
    [
      {
        id: "release-group:musicbrainz:rg1",
        type: "release_group",
        title: "Midra",
        date: "2025-02-14"
      },
      {
        id: "release:musicbrainz:r1",
        type: "release",
        title: "Midra",
        date: "2025-02-14",
        artists: [
          {
            id: "artist:musicbrainz:75748032-9c11-4602-969d-525036dfc8ce",
            name: "Acidpach"
          }
        ]
      },
      {
        id: "mbid:75748032-9c11-4602-969d-525036dfc8ce",
        type: "artist",
        name: "Acidpach",
        externalIds: {
          musicbrainz: "75748032-9c11-4602-969d-525036dfc8ce"
        }
      },
      {
        id: "label:musicbrainz-name:shz-records",
        type: "label",
        name: "SHZ Records"
      },
      {
        id: "label:musicbrainz:722cb564-1b85-4a78-9753-27a6c10e50d5",
        type: "label",
        name: "SHZ Records",
        externalIds: {
          musicbrainz: "722cb564-1b85-4a78-9753-27a6c10e50d5"
        }
      }
    ],
    [
      {
        from: "mbid:75748032-9c11-4602-969d-525036dfc8ce",
        to: "release-group:musicbrainz:rg1",
        kind: "primary_artist",
        status: "observed"
      },
      {
        from: "release-group:musicbrainz:rg1",
        to: "label:musicbrainz-name:shz-records",
        kind: "issued_by",
        status: "observed"
      },
      {
        from: "artist:musicbrainz:75748032-9c11-4602-969d-525036dfc8ce",
        to: "release:musicbrainz:r1",
        kind: "credited_on_release",
        status: "observed"
      },
      {
        from: "release:musicbrainz:r1",
        to: "label:musicbrainz:722cb564-1b85-4a78-9753-27a6c10e50d5",
        kind: "issued_by",
        status: "observed"
      }
    ]
  );

  const rows = buildSeedCatalog(state).label.filter(
    (row) => row.label === "SHZ Records"
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0].memberIds.length, 2);
});

test("même nom MusicBrainz sans contexte de sortie corroboré reste distinct", () => {
  const state = graph(
    [
      {
        id: "release-group:musicbrainz:rg1",
        type: "release_group",
        title: "Alpha",
        date: "2025-01-01"
      },
      {
        id: "release:musicbrainz:r1",
        type: "release",
        title: "Beta",
        date: "2025-01-01",
        artists: [
          {
            id: "artist:musicbrainz:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            name: "Other Artist"
          }
        ]
      },
      {
        id: "mbid:bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        type: "artist",
        name: "Artist One",
        externalIds: {
          musicbrainz: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
        }
      },
      {
        id: "label:musicbrainz-name:same-label",
        type: "label",
        name: "Same Label"
      },
      {
        id: "label:musicbrainz:cccccccc-cccc-cccc-cccc-cccccccccccc",
        type: "label",
        name: "Same Label",
        externalIds: {
          musicbrainz: "cccccccc-cccc-cccc-cccc-cccccccccccc"
        }
      }
    ],
    [
      {
        from: "mbid:bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        to: "release-group:musicbrainz:rg1",
        kind: "primary_artist",
        status: "observed"
      },
      {
        from: "release-group:musicbrainz:rg1",
        to: "label:musicbrainz-name:same-label",
        kind: "issued_by",
        status: "observed"
      },
      {
        from: "release:musicbrainz:r1",
        to: "label:musicbrainz:cccccccc-cccc-cccc-cccc-cccccccccccc",
        kind: "issued_by",
        status: "observed"
      }
    ]
  );

  const rows = buildSeedCatalog(state).label.filter(
    (row) => row.label === "Same Label"
  );

  assert.equal(rows.length, 2);
});

test("même titre et date mais artistes MusicBrainz différents ne fusionnent pas les labels", () => {
  const state = graph(
    [
      {
        id: "release-group:musicbrainz:rg1",
        type: "release_group",
        title: "Common Title",
        date: "2025-01-01"
      },
      {
        id: "release:musicbrainz:r1",
        type: "release",
        title: "Common Title",
        date: "2025-01-01",
        artists: [
          {
            id: "artist:musicbrainz:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            name: "Artist A"
          }
        ]
      },
      {
        id: "mbid:bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        type: "artist",
        name: "Artist B",
        externalIds: {
          musicbrainz: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
        }
      },
      {
        id: "label:musicbrainz-name:homonym",
        type: "label",
        name: "Homonym"
      },
      {
        id: "label:musicbrainz:cccccccc-cccc-cccc-cccc-cccccccccccc",
        type: "label",
        name: "Homonym",
        externalIds: {
          musicbrainz: "cccccccc-cccc-cccc-cccc-cccccccccccc"
        }
      }
    ],
    [
      {
        from: "mbid:bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        to: "release-group:musicbrainz:rg1",
        kind: "primary_artist",
        status: "observed"
      },
      {
        from: "release-group:musicbrainz:rg1",
        to: "label:musicbrainz-name:homonym",
        kind: "issued_by",
        status: "observed"
      },
      {
        from: "release:musicbrainz:r1",
        to: "label:musicbrainz:cccccccc-cccc-cccc-cccc-cccccccccccc",
        kind: "issued_by",
        status: "observed"
      }
    ]
  );

  const rows = buildSeedCatalog(state).label.filter(
    (row) => row.label === "Homonym"
  );

  assert.equal(rows.length, 2);
});

test("Discogs et MusicBrainz regroupent un label si une même sortie partage son numéro de catalogue", () => {
  const state = graph(
    [
      {
        id: "release:discogs:1",
        type: "release",
        title: "Trailer Park Prophet EP",
        date: "2018",
        catalogueNumber: "PRRUKBLK029"
      },
      {
        id: "release:musicbrainz:1",
        type: "release",
        title: "Trailer Park Prophet EP",
        date: "2018-06-18"
      },
      {
        id: "label:discogs-name:planet-rhythm-records",
        type: "label",
        name: "Planet Rhythm Records"
      },
      {
        id: "label:musicbrainz:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        type: "label",
        name: "Planet Rhythm Records",
        externalIds: {
          musicbrainz: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
        }
      }
    ],
    [
      {
        from: "release:discogs:1",
        to: "label:discogs-name:planet-rhythm-records",
        kind: "issued_by",
        status: "observed"
      },
      {
        from: "release:musicbrainz:1",
        to: "label:musicbrainz:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        kind: "issued_by",
        status: "observed",
        catalogueNumber: "PRRUKBLK029"
      }
    ]
  );

  const rows = buildSeedCatalog(state).label.filter(
    row => row.label === "Planet Rhythm Records"
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0].memberIds.length, 2);
});

test("même label et même sortie sans numéro de catalogue commun restent distincts entre fournisseurs", () => {
  const state = graph(
    [
      {
        id: "release:discogs:1",
        type: "release",
        title: "Same Release",
        date: "2020"
      },
      {
        id: "release:musicbrainz:1",
        type: "release",
        title: "Same Release",
        date: "2020-01-01"
      },
      {
        id: "label:discogs-name:same-label",
        type: "label",
        name: "Same Label"
      },
      {
        id: "label:musicbrainz:bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        type: "label",
        name: "Same Label",
        externalIds: {
          musicbrainz: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
        }
      }
    ],
    [
      {
        from: "release:discogs:1",
        to: "label:discogs-name:same-label",
        kind: "issued_by",
        status: "observed"
      },
      {
        from: "release:musicbrainz:1",
        to: "label:musicbrainz:bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        kind: "issued_by",
        status: "observed"
      }
    ]
  );

  const rows = buildSeedCatalog(state).label.filter(
    row => row.label === "Same Label"
  );

  assert.equal(rows.length, 2);
});

test("un numéro de catalogue identique ne fusionne pas deux labels de noms différents", () => {
  const state = graph(
    [
      {
        id: "release:discogs:1",
        type: "release",
        title: "Shared Release",
        date: "2021",
        catalogueNumber: "CAT001"
      },
      {
        id: "release:musicbrainz:1",
        type: "release",
        title: "Shared Release",
        date: "2021-03-01"
      },
      {
        id: "label:discogs-name:alpha",
        type: "label",
        name: "Alpha Records"
      },
      {
        id: "label:musicbrainz:cccccccc-cccc-cccc-cccc-cccccccccccc",
        type: "label",
        name: "Beta Records",
        externalIds: {
          musicbrainz: "cccccccc-cccc-cccc-cccc-cccccccccccc"
        }
      }
    ],
    [
      {
        from: "release:discogs:1",
        to: "label:discogs-name:alpha",
        kind: "issued_by",
        status: "observed"
      },
      {
        from: "release:musicbrainz:1",
        to: "label:musicbrainz:cccccccc-cccc-cccc-cccc-cccccccccccc",
        kind: "issued_by",
        status: "observed",
        catalogueNumber: "CAT001"
      }
    ]
  );

  const labels = buildSeedCatalog(state).label;

  assert.ok(labels.some(row => row.label === "Alpha Records"));
  assert.ok(labels.some(row => row.label === "Beta Records"));
});

test("même catalogue et même label mais titres différents ne fusionnent pas", () => {
  const state = graph(
    [
      {
        id: "release:discogs:1",
        type: "release",
        title: "Alpha EP",
        date: "2022",
        catalogueNumber: "X001"
      },
      {
        id: "release:musicbrainz:1",
        type: "release",
        title: "Beta EP",
        date: "2022-01-01"
      },
      {
        id: "label:discogs-name:test-records",
        type: "label",
        name: "Test Records"
      },
      {
        id: "label:musicbrainz:dddddddd-dddd-dddd-dddd-dddddddddddd",
        type: "label",
        name: "Test Records",
        externalIds: {
          musicbrainz: "dddddddd-dddd-dddd-dddd-dddddddddddd"
        }
      }
    ],
    [
      {
        from: "release:discogs:1",
        to: "label:discogs-name:test-records",
        kind: "issued_by",
        status: "observed"
      },
      {
        from: "release:musicbrainz:1",
        to: "label:musicbrainz:dddddddd-dddd-dddd-dddd-dddddddddddd",
        kind: "issued_by",
        status: "observed",
        catalogueNumber: "X001"
      }
    ]
  );

  const rows = buildSeedCatalog(state).label.filter(
    row => row.label === "Test Records"
  );

  assert.equal(rows.length, 2);
});
