import test from "node:test";
import assert from "node:assert/strict";
import { augmentExplorationGraph, buildSeedCatalog, projectActiveCollectionGraph, collaborationGraph, continueFromBranch, createExplorationSession, rerollExplorationBranch, sanitizeExplorationGraph, seedCoverage } from "./exploration.mjs";

const library = [
  { id: "v1", title: "A - One", artist: "A", channelTitle: "Curator", channelId: `UC${"a".repeat(22)}`, publishedAt: "1996-01-01", playlistIds: ["p"], playlistNames: ["Archive"] },
  { id: "v2", title: "B - Two", artist: "B", channelTitle: "Curator", channelId: `UC${"a".repeat(22)}`, publishedAt: "1998-01-01", playlistIds: ["p"], playlistNames: ["Archive"] },
  { id: "v3", title: "C - Three", artist: "C", channelTitle: "Other", channelId: `UC${"b".repeat(22)}`, publishedAt: "2024-01-01", playlistIds: ["q"], playlistNames: ["Fresh"] }
];

test("construit des graines morceau, artiste, label et playlist", () => {
  const graph = augmentExplorationGraph({
    entities: { "label:x": { id: "label:x", type: "label", name: "Label X" } },
    edges: { "label-video": { from: "label:x", to: "video:youtube:v1", kind: "associated_label", status: "structured_claim" } }
  }, library);
  const seeds = buildSeedCatalog(graph, library);
  assert.ok(seeds.track.some(({ label }) => label === "A - One"));
  assert.ok(seeds.artist.some(({ label }) => label === "A"));
  assert.equal(seeds.label[0].label, "Label X");
  assert.ok(seeds.playlist.some(({ label }) => label === "Archive"));
});

test("traverse une chaîne-curatrice, reroll puis marque l’épuisement", () => {
  const graph = augmentExplorationGraph({}, library);
  let session = createExplorationSession({ state: graph, seed: { id: "video:youtube:v1", type: "track", label: "A - One" }, directions: ["curator"], depth: 2, coverage: { curator: { state: "complete" } } });
  assert.equal(session.branches[0].current.target.id, "video:youtube:v2");
  session = rerollExplorationBranch(session, session.branches[0].id);
  assert.equal(session.branches[0].status, "exhausted");
});

test("continue depuis une branche en conservant la lignée", () => {
  const graph = augmentExplorationGraph({}, library);
  const session = createExplorationSession({ state: graph, seed: { id: "video:youtube:v1", type: "track", label: "A - One" }, directions: ["curator"], depth: 2, coverage: { curator: { state: "complete" } } });
  const continued = continueFromBranch({ state: graph, session, branchId: session.branches[0].id });
  assert.equal(continued.seed.id, "video:youtube:v2");
  assert.equal(continued.lineage.length, 1);
});

test("injecte les co-crédits locaux dans le graphe sans fusionner les homonymes", () => {
  const collaborations = [{ artists: ["A", "B"], kinds: { featuring: 2, remix: 1 }, videoIds: ["v1", "v2"] }];
  const fragment = collaborationGraph(collaborations);
  assert.equal(fragment.entities.length, 2);
  assert.deepEqual(new Set(fragment.edges.map(({ kind }) => kind)), new Set(["featured_with", "remixed_by"]));
  const graph = augmentExplorationGraph({
    entities: {
      "artist:discogs:1": { id: "artist:discogs:1", type: "artist", name: "A" },
      "artist:musicbrainz:2": { id: "artist:musicbrainz:2", type: "artist", name: "A" }
    },
    edges: {}
  }, [], collaborations);
  assert.equal(Object.values(graph.edges).some(({ kind }) => kind === "same_identity"), false);
});

test("neutralise les anciennes fusions de nom et leurs catalogues Discogs", () => {
  const graph = sanitizeExplorationGraph({
    entities: {
      video: { id: "video", type: "video", title: "A - Track" },
      artist: { id: "artist", type: "artist", name: "A" },
      local: { id: "local", type: "artist", name: "A" },
      release: { id: "release", type: "release", title: "Mauvais catalogue" },
      label: { id: "label", type: "label", name: "Mauvais label" }
    },
    edges: {
      hypothesis: { from: "video", to: "artist", kind: "probable_artist", status: "single_source" },
      fusion: { from: "artist", to: "local", kind: "same_identity", status: "same_name" },
      catalogue: { from: "artist", to: "release", kind: "credited_on_release", status: "observed" },
      imprint: { from: "release", to: "label", kind: "issued_by", status: "observed" }
    }
  });
  assert.equal(graph.entities.release, undefined);
  assert.equal(graph.edges.fusion, undefined);
  assert.equal(graph.edges.catalogue, undefined);
  assert.equal(graph.edges.imprint, undefined);
});

test("distingue une branche non explorée, indisponible et réellement épuisée", () => {
  const seed = { id: "video:youtube:v3", type: "track", label: "C - Three" };
  const graph = augmentExplorationGraph({}, library);
  const unexplored = createExplorationSession({ state: graph, seed, directions: ["label"], depth: 3 });
  assert.equal(unexplored.branches[0].status, "unexplored");
  const unavailable = createExplorationSession({ state: graph, seed, directions: ["label"], depth: 3, coverage: { label: { state: "unavailable" } } });
  assert.equal(unavailable.branches[0].status, "source_unavailable");
  const exhausted = createExplorationSession({ state: graph, seed, directions: ["label"], depth: 3, coverage: { label: { state: "complete" } } });
  assert.equal(exhausted.branches[0].status, "exhausted");
});

test("mesure seulement les relations et cibles praticables dans la portée choisie", () => {
  const graph = augmentExplorationGraph({}, library);
  const metrics = seedCoverage(graph, "video:youtube:v1", ["curator", "era"], 2);
  assert.equal(metrics.documentedRelations, 4);
  assert.equal(metrics.practicableBranches, 1);
  assert.equal(metrics.reachableTargets, 1);
});

test("la date d’upload seule ne permet pas une proximité d’époque musicale", () => {
 const graph = augmentExplorationGraph({}, library);
 const session = createExplorationSession({ state: graph, seed: { id: "video:youtube:v1", type: "track" }, directions: ["era"], depth: 6 });
 assert.equal(session.branches[0].current, null);
 assert.notEqual(session.branches[0].status, "exhausted");
});

test("un recalcul ne ressuscite pas une piste consommée ni une branche laissée de côté", () => {
 const state = augmentExplorationGraph({}, library);
 let previous = createExplorationSession({state, seed:{id:"video:youtube:v1",type:"track"}, directions:["curator"],depth:3,coverage:{curator:{state:"complete"}}});
 previous = rerollExplorationBranch(previous, previous.branches[0].id);
 assert.equal(previous.branches[0].current,null);
 const resumed = createExplorationSession({state,seed:previous.seed,directions:previous.directions,depth:3,previous,coverage:previous.coverage});
 assert.equal(resumed.branches[0].current,null);
 assert.deepEqual(resumed.branches[0].seenSignatures,previous.branches[0].seenSignatures);
 previous.branches[0].status="paused";
 assert.equal(createExplorationSession({state,seed:previous.seed,directions:previous.directions,previous}).branches[0].status,"paused");
});

test("Discogs et MusicBrainz regroupent une sortie si Discogs préfixe exactement le titre par le crédit artiste", () => {
  const state = {
    entities: {
      "release:discogs:planet": {
        id: "release:discogs:planet",
        type: "release",
        title: "Dubiosity & Pjotr G - Trailer Park Prophet EP",
        date: "2018",
        catalogueNumber: "PRRUKBLK029"
      },
      "label:discogs-name:planet-rhythm-records": {
        id: "label:discogs-name:planet-rhythm-records",
        type: "label",
        name: "Planet Rhythm Records"
      },
      "release:musicbrainz:planet": {
        id: "release:musicbrainz:planet",
        type: "release",
        title: "Trailer Park Prophet EP",
        date: "2018-06-18"
      },
      "label:musicbrainz:planet": {
        id: "label:musicbrainz:planet",
        type: "label",
        name: "Planet Rhythm Records",
        externalIds: { musicbrainz: "planet" }
      }
    },
    edges: {
      discogs: {
        from: "release:discogs:planet",
        to: "label:discogs-name:planet-rhythm-records",
        kind: "issued_by",
        status: "observed"
      },
      musicbrainz: {
        from: "release:musicbrainz:planet",
        to: "label:musicbrainz:planet",
        kind: "issued_by",
        status: "observed",
        catalogueNumber: "PRRUKBLK029"
      }
    }
  };

  const seeds = buildSeedCatalog(state, []);
  const matches = seeds.label.filter(
    seed => seed.label === "Planet Rhythm Records"
  );

  assert.equal(matches.length, 1);
  assert.equal(matches[0].memberIds.length, 2);
});

test("un préfixe éditorial ne suffit jamais sans même numéro de catalogue", () => {
  const state = {
    entities: {
      "release:discogs:x": {
        id: "release:discogs:x",
        type: "release",
        title: "Artist - Same Release",
        date: "2020",
        catalogueNumber: "ABC001"
      },
      "label:discogs-name:test-label": {
        id: "label:discogs-name:test-label",
        type: "label",
        name: "Test Label"
      },
      "release:musicbrainz:x": {
        id: "release:musicbrainz:x",
        type: "release",
        title: "Same Release",
        date: "2020"
      },
      "label:musicbrainz:x": {
        id: "label:musicbrainz:x",
        type: "label",
        name: "Test Label",
        externalIds: { musicbrainz: "x" }
      }
    },
    edges: {
      discogs: {
        from: "release:discogs:x",
        to: "label:discogs-name:test-label",
        kind: "issued_by",
        status: "observed"
      },
      musicbrainz: {
        from: "release:musicbrainz:x",
        to: "label:musicbrainz:x",
        kind: "issued_by",
        status: "observed",
        catalogueNumber: "XYZ999"
      }
    }
  };

  const seeds = buildSeedCatalog(state, []);
  const matches = seeds.label.filter(seed => seed.label === "Test Label");

  assert.equal(matches.length, 2);
});

test("même catalogue et même année ne compensent jamais un vrai titre différent", () => {
  const state = {
    entities: {
      "release:discogs:y": {
        id: "release:discogs:y",
        type: "release",
        title: "Artist - Release One",
        date: "2020",
        catalogueNumber: "CAT001"
      },
      "label:discogs-name:test-label-2": {
        id: "label:discogs-name:test-label-2",
        type: "label",
        name: "Test Label 2"
      },
      "release:musicbrainz:y": {
        id: "release:musicbrainz:y",
        type: "release",
        title: "Release Two",
        date: "2020"
      },
      "label:musicbrainz:y": {
        id: "label:musicbrainz:y",
        type: "label",
        name: "Test Label 2",
        externalIds: { musicbrainz: "y" }
      }
    },
    edges: {
      discogs: {
        from: "release:discogs:y",
        to: "label:discogs-name:test-label-2",
        kind: "issued_by",
        status: "observed"
      },
      musicbrainz: {
        from: "release:musicbrainz:y",
        to: "label:musicbrainz:y",
        kind: "issued_by",
        status: "observed",
        catalogueNumber: "CAT001"
      }
    }
  };

  const seeds = buildSeedCatalog(state, []);
  const matches = seeds.label.filter(seed => seed.label === "Test Label 2");

  assert.equal(matches.length, 2);
});


test("Discogs et MusicBrainz regroupent un label sans catalogue si titre, année et identité artiste structurée concordent", () => {
  const state = {
    entities: {
      "release:discogs:syncro": {
        id: "release:discogs:syncro",
        type: "release",
        title: "Lost In Change",
        date: "2025"
      },
      "label:discogs:74957": {
        id: "label:discogs:74957",
        type: "label",
        name: "Syncrophone",
        externalIds: { discogs: "74957" },
        source: "discogs"
      },
      "artist:discogs:5927130": {
        id: "artist:discogs:5927130",
        type: "artist",
        name: "Kosh (7)",
        externalIds: { discogs: "5927130" },
        source: "discogs"
      },

      "release-group:musicbrainz:syncro": {
        id: "release-group:musicbrainz:syncro",
        type: "release_group",
        title: "Lost in Change",
        date: "2025-04-18"
      },
      "label:musicbrainz-name:syncrophone": {
        id: "label:musicbrainz-name:syncrophone",
        type: "label",
        name: "Syncrophone"
      },
      "artist:musicbrainz:423f5b9f-f9c9-4d57-936e-704b47cf19c3": {
        id: "artist:musicbrainz:423f5b9f-f9c9-4d57-936e-704b47cf19c3",
        type: "artist",
        name: "Kosh",
        externalIds: {
          musicbrainz: "423f5b9f-f9c9-4d57-936e-704b47cf19c3"
        },
        source: "musicbrainz"
      }
    },

    edges: {
      discogsLabel: {
        from: "release:discogs:syncro",
        to: "label:discogs:74957",
        kind: "issued_by",
        status: "observed"
      },

      discogsArtist: {
        from: "artist:discogs:5927130",
        to: "release:discogs:syncro",
        kind: "credited_on_release",
        status: "observed"
      },

      musicbrainzLabel: {
        from: "release-group:musicbrainz:syncro",
        to: "label:musicbrainz-name:syncrophone",
        kind: "issued_by",
        status: "observed"
      },

      musicbrainzArtist: {
        from: "artist:musicbrainz:423f5b9f-f9c9-4d57-936e-704b47cf19c3",
        to: "release-group:musicbrainz:syncro",
        kind: "primary_artist",
        status: "observed"
      },

      artistIdentity: {
        from: "artist:discogs:5927130",
        to: "artist:musicbrainz:423f5b9f-f9c9-4d57-936e-704b47cf19c3",
        kind: "same_identity",
        status: "confirmed_cross_id"
      }
    }
  };

  const seeds = buildSeedCatalog(state, []);

  const matches = seeds.label.filter(
    seed => seed.label === "Syncrophone"
  );

  assert.equal(matches.length, 1);

  assert.deepEqual(
    new Set(matches[0].memberIds),
    new Set([
      "label:discogs:74957",
      "label:musicbrainz-name:syncrophone"
    ])
  );
});


test("même titre et même année sans identité artiste corroborée ne fusionnent pas les labels", () => {
  const state = {
    entities: {
      "release:discogs:homonym": {
        id: "release:discogs:homonym",
        type: "release",
        title: "Shared Release",
        date: "2024"
      },
      "label:discogs-name:shared-label": {
        id: "label:discogs-name:shared-label",
        type: "label",
        name: "Shared Label"
      },
      "artist:discogs:111": {
        id: "artist:discogs:111",
        type: "artist",
        name: "Same Artist",
        externalIds: { discogs: "111" },
        source: "discogs"
      },

      "release-group:musicbrainz:homonym": {
        id: "release-group:musicbrainz:homonym",
        type: "release_group",
        title: "Shared Release",
        date: "2024-06-01"
      },
      "label:musicbrainz-name:shared-label": {
        id: "label:musicbrainz-name:shared-label",
        type: "label",
        name: "Shared Label"
      },
      "artist:musicbrainz:11111111-1111-1111-1111-111111111111": {
        id: "artist:musicbrainz:11111111-1111-1111-1111-111111111111",
        type: "artist",
        name: "Same Artist",
        externalIds: {
          musicbrainz: "11111111-1111-1111-1111-111111111111"
        },
        source: "musicbrainz"
      }
    },

    edges: {
      discogsLabel: {
        from: "release:discogs:homonym",
        to: "label:discogs-name:shared-label",
        kind: "issued_by",
        status: "observed"
      },

      discogsArtist: {
        from: "artist:discogs:111",
        to: "release:discogs:homonym",
        kind: "credited_on_release",
        status: "observed"
      },

      musicbrainzLabel: {
        from: "release-group:musicbrainz:homonym",
        to: "label:musicbrainz-name:shared-label",
        kind: "issued_by",
        status: "observed"
      },

      musicbrainzArtist: {
        from: "artist:musicbrainz:11111111-1111-1111-1111-111111111111",
        to: "release-group:musicbrainz:homonym",
        kind: "primary_artist",
        status: "observed"
      }
    }
  };

  const seeds = buildSeedCatalog(state, []);

  const matches = seeds.label.filter(
    seed => seed.label === "Shared Label"
  );

  /*
   * Le nom "Same Artist" est identique des deux côtés, mais les deux
   * identités structurées ne sont reliées par aucune preuve d'équivalence.
   *
   * Le simple homonyme ne doit jamais créer le pont.
   */
  assert.equal(matches.length, 2);
});


test("même artiste structuré et même année mais titres différents ne fusionnent pas les labels", () => {
  const state = {
    entities: {
      "release:discogs:different-title": {
        id: "release:discogs:different-title",
        type: "release",
        title: "Release Alpha",
        date: "2025"
      },
      "label:discogs-name:test-cross-label": {
        id: "label:discogs-name:test-cross-label",
        type: "label",
        name: "Test Cross Label"
      },
      "artist:discogs:222": {
        id: "artist:discogs:222",
        type: "artist",
        name: "Artist Alias",
        externalIds: { discogs: "222" },
        source: "discogs"
      },

      "release-group:musicbrainz:different-title": {
        id: "release-group:musicbrainz:different-title",
        type: "release_group",
        title: "Release Beta",
        date: "2025-08-15"
      },
      "label:musicbrainz-name:test-cross-label": {
        id: "label:musicbrainz-name:test-cross-label",
        type: "label",
        name: "Test Cross Label"
      },
      "artist:musicbrainz:22222222-2222-2222-2222-222222222222": {
        id: "artist:musicbrainz:22222222-2222-2222-2222-222222222222",
        type: "artist",
        name: "Artist Canonical",
        externalIds: {
          musicbrainz: "22222222-2222-2222-2222-222222222222"
        },
        source: "musicbrainz"
      }
    },

    edges: {
      discogsLabel: {
        from: "release:discogs:different-title",
        to: "label:discogs-name:test-cross-label",
        kind: "issued_by",
        status: "observed"
      },

      discogsArtist: {
        from: "artist:discogs:222",
        to: "release:discogs:different-title",
        kind: "credited_on_release",
        status: "observed"
      },

      musicbrainzLabel: {
        from: "release-group:musicbrainz:different-title",
        to: "label:musicbrainz-name:test-cross-label",
        kind: "issued_by",
        status: "observed"
      },

      musicbrainzArtist: {
        from: "artist:musicbrainz:22222222-2222-2222-2222-222222222222",
        to: "release-group:musicbrainz:different-title",
        kind: "primary_artist",
        status: "observed"
      },

      artistIdentity: {
        from: "artist:discogs:222",
        to: "artist:musicbrainz:22222222-2222-2222-2222-222222222222",
        kind: "same_identity",
        status: "confirmed_cross_id"
      }
    }
  };

  const seeds = buildSeedCatalog(state, []);

  const matches = seeds.label.filter(
    seed => seed.label === "Test Cross Label"
  );

  /*
   * L'artiste est bien la même identité structurée et l'année concorde,
   * mais les sorties ne sont pas les mêmes.
   */
  assert.equal(matches.length, 2);
});


test("une same_identity faible ne fusionne jamais deux identités de seed", () => {
  const graph = {
    entities: {
      "artist:test:a": {
        id: "artist:test:a",
        type: "artist",
        name: "Même nom"
      },
      "artist:test:b": {
        id: "artist:test:b",
        type: "artist",
        name: "Même nom"
      }
    },
    edges: {
      weak: {
        from: "artist:test:a",
        to: "artist:test:b",
        kind: "same_identity",
        status: "same_name"
      }
    }
  };

  const seeds = buildSeedCatalog(graph, []);

  const matching = seeds.artist.filter(
    seed => seed.label === "Même nom"
  );

  assert.equal(matching.length, 2);
  assert.notEqual(
    matching[0].identityClusterId,
    matching[1].identityClusterId
  );
});

test("une same_identity confirmée fusionne bien les représentations d'une même identité", () => {
  const graph = {
    entities: {
      "artist:musicbrainz:11111111-1111-1111-1111-111111111111": {
        id: "artist:musicbrainz:11111111-1111-1111-1111-111111111111",
        type: "artist",
        name: "Artiste",
        externalIds: {
          musicbrainz: "11111111-1111-1111-1111-111111111111"
        }
      },
      "artist:discogs:123": {
        id: "artist:discogs:123",
        type: "artist",
        name: "Artiste",
        externalIds: {
          discogs: "123"
        }
      }
    },
    edges: {
      strong: {
        from: "artist:musicbrainz:11111111-1111-1111-1111-111111111111",
        to: "artist:discogs:123",
        kind: "same_identity",
        status: "confirmed_cross_id"
      }
    }
  };

  const seeds = buildSeedCatalog(graph, []);

  const matching = seeds.artist.filter(
    seed => seed.label === "Artiste"
  );

  assert.equal(matching.length, 1);
  assert.equal(matching[0].memberIds.length, 2);
});

test("une same_identity faible ne suffit pas à rendre une hypothèse artiste éligible au picker", () => {
  const graph = {
    entities: {
      "video:youtube:weak-seed": {
        id: "video:youtube:weak-seed",
        type: "video",
        title: "Unknown track"
      },
      "artist:local:weak": {
        id: "artist:local:weak",
        type: "artist",
        name: "Weak Artist",
        status: "local_hypothesis"
      },
      "artist:local:other": {
        id: "artist:local:other",
        type: "artist",
        name: "Weak Artist"
      }
    },
    edges: {
      probable: {
        from: "video:youtube:weak-seed",
        to: "artist:local:weak",
        kind: "probable_artist",
        status: "local_hypothesis"
      },
      weakIdentity: {
        from: "artist:local:weak",
        to: "artist:local:other",
        kind: "same_identity",
        status: "same_name"
      }
    }
  };

  const seeds = buildSeedCatalog(graph, []);

  assert.equal(
    seeds.artist.some(seed =>
      seed.memberIds.includes("artist:local:weak")
    ),
    false
  );
});

test("le picker ne propose que les playlists présentes dans la bibliothèque active", () => {
  const state = augmentExplorationGraph({}, [
    {
      id: "v1",
      title: "A - One",
      playlistIds: ["owned"],
      playlistNames: ["Owned"]
    },
    {
      id: "v2",
      title: "B - Two",
      playlistIds: ["old"],
      playlistNames: ["Old"]
    }
  ]);

  /*
   * Le graphe garde les deux playlists, mais la bibliothèque active
   * ne contient plus que "owned".
   */
  const activeLibrary = [
    {
      id: "v1",
      title: "A - One",
      playlistIds: ["owned"],
      playlistNames: ["Owned"]
    }
  ];

  const seeds =
    buildSeedCatalog(state, activeLibrary);

  assert.deepEqual(
    seeds.playlist.map(({ label }) => label),
    ["Owned"]
  );
});

test("une playlist historique absente de la bibliothèque reste hors picker sans être supprimée du graphe", () => {
  const state = augmentExplorationGraph({}, [
    {
      id: "v1",
      title: "A - One",
      playlistIds: ["old"],
      playlistNames: ["Old"]
    }
  ]);

  const seeds =
    buildSeedCatalog(state, []);

  assert.equal(
    seeds.playlist.some(({ label }) => label === "Old"),
    false
  );

  assert.ok(
    state.entities["playlist:youtube:old"]
  );
});

test("la projection active exclut les artistes historiques sans lien avec la collection chargée", () => {
  const state = {
    entities: {
      "video:youtube:active": {
        id: "video:youtube:active",
        type: "video",
        title: "Active - Track"
      },
      "artist:active": {
        id: "artist:active",
        type: "artist",
        name: "Active Artist",
        seedEligible: true,
        status: "local_supported"
      },
      "artist:history": {
        id: "artist:history",
        type: "artist",
        name: "808NOCHE",
        externalIds: { discogs: "999" },
        status: "resolved"
      },
      "release:history": {
        id: "release:history",
        type: "release",
        title: "Old Release"
      }
    },
    edges: {
      active: {
        from: "video:youtube:active",
        to: "artist:active",
        kind: "probable_artist",
        status: "local_supported"
      },
      historical: {
        from: "artist:history",
        to: "release:history",
        kind: "primary_artist",
        status: "observed"
      }
    }
  };

  const library = [
    {
      id: "active",
      title: "Active - Track",
      artist: "Active Artist",
      playlistIds: ["current"],
      playlistNames: ["Current"]
    }
  ];

  const projected =
    projectActiveCollectionGraph(state, library);

  assert.ok(
    projected.entities["artist:active"]
  );

  assert.equal(
    projected.entities["artist:history"],
    undefined
  );

  const seeds =
    buildSeedCatalog(projected, library);

  assert.equal(
    seeds.artist.some(({ label }) => label === "808NOCHE"),
    false
  );
});

test("la projection active conserve une identité corroborée d'un artiste de la collection", () => {
  const state = {
    entities: {
      "video:youtube:v1": {
        id: "video:youtube:v1",
        type: "video",
        title: "Artist - Track"
      },
      "artist:local:a": {
        id: "artist:local:a",
        type: "artist",
        name: "Artist",
        seedEligible: true,
        status: "local_supported"
      },
      "artist:discogs:42": {
        id: "artist:discogs:42",
        type: "artist",
        name: "Artist",
        externalIds: { discogs: "42" },
        status: "resolved"
      }
    },
    edges: {
      local: {
        from: "video:youtube:v1",
        to: "artist:local:a",
        kind: "probable_artist",
        status: "local_supported"
      },
      identity: {
        from: "artist:local:a",
        to: "artist:discogs:42",
        kind: "same_identity",
        status: "confirmed_cross_id"
      }
    }
  };

  const library = [
    {
      id: "v1",
      title: "Artist - Track",
      artist: "Artist"
    }
  ];

  const projected =
    projectActiveCollectionGraph(state, library);

  assert.ok(
    projected.entities["artist:discogs:42"]
  );
});
