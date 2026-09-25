import test from "node:test";
import assert from "node:assert/strict";
import { applyFeedback, graphFromResolution, normalizeDiscoveryCandidates, summarizeGraph } from "./graph.mjs";

test("compile une résolution en graphe traçable", () => {
  const graph = graphFromResolution(
    { id: "yt", title: "A - R" },
    { id: "mbid:a", canonicalName: "A", claims: [{ field: "name", value: "A", source: "musicbrainz" }] },
    { resolved: { id: "r", title: "R", releases: [{ id: "rel", title: "Album", date: "2024" }] } }
  );
  assert.equal(graph.entities.length, 5);
  assert.ok(graph.edges.some(({ kind }) => kind === "appears_on"));
  assert.ok(graph.edges.some(({ kind }) => kind === "released_in_era"));
  assert.equal(graph.claims[0].subject, "mbid:a");
});

test("relie artistes, labels, sorties, crédits et Bandcamp sans score global", () => {
  const graph = graphFromResolution(
    { id: "yt", title: "A feat. B - R" },
    { id: "mbid:a", canonicalName: "A", externalIds: { musicbrainz: "a", discogs: "1", wikidata: "Q1" }, claims: [] },
    {
      resolved: { id: "r", title: "R", artistCredits: [{ id: "a", name: "A" }, { id: "b", name: "B" }], releases: [] },
      discogsCandidates: [{ id: 9, title: "A - R", labels: ["Label D"], corroborates: true }]
    },
    {
      music: { artist: { id: "a" }, releases: [{ id: "rg", title: "Album", labels: ["Label M"] }] },
      wikidata: { id: "Q1", labels: ["Label W"] },
      discogs: { id: 1, releases: [{ id: 10, title: "EP", type: "master", role: "Main", label: "Label D" }] },
      bandcamp: { url: "https://a.bandcamp.com/", source: "wikidata" },
      collaborations: [{ artist: "B", kind: "featuring" }]
    }
  );
  const summary = summarizeGraph({
    entities: Object.fromEntries(graph.entities.map((entity) => [entity.id, entity])),
    edges: Object.fromEntries(graph.edges.map((edge, index) => [index, edge]))
  });
  assert.equal(summary.byType.label, 3);
  assert.equal(summary.byType.release_group, 1);
  assert.ok(summary.byRelation.featured_with >= 1);
  assert.ok(summary.byRelation.issued_by >= 2);
  assert.equal(summary.byRelation.associated_label, 1);
  assert.ok(graph.claims.some(({ field, source }) => field === "profile_url" && source === "wikidata"));
  assert.equal("score" in summary, false);
});

test("déduplique les voisins et applique un retour qualitatif", () => {
  const candidates = normalizeDiscoveryCandidates({ candidates: [
    { recording_mbid: "r1", recording_name: "Un", artist_name: "A" },
    { recording_mbid: "r1", recording_name: "Un", artist_name: "A" },
    { recording_mbid: "r2", recording_name: "Deux", artist_name: "B" }
  ] });
  assert.equal(candidates.length, 2);
  assert.deepEqual(applyFeedback(candidates, [{ targetId: "r1", kind: "not_now" }]).map(({ key }) => key), ["r2"]);
});

test("graphFromResolution matérialise les artistes Discogs structurés d'un candidat normalisé", () => {
  const graph = graphFromResolution(
    { id: "yt-discogs-structured", title: "Kosh - Lost In Change" },
    null,
    {
      discogsCandidates: [
        {
          source: "discogs",
          sourceId: "33895134",
          artists: ["Kosh"],
          title: "Lost In Change",
          version: "",
          catalogueCode: "SYNCRO63",
          corroborates: true,
          evidence: {
            releaseId: "33895134",
            artistIds: ["5927130"],
            labelIds: ["74957"],
            resourceUrl: "https://api.discogs.com/releases/33895134",
            provenance: "discogs_release_or_search"
          },
          raw: {
            id: 33895134,
            title: "Kosh - Lost In Change",
            year: 2025,
            artists: [
              {
                id: 5927130,
                name: "Kosh"
              }
            ],
            labels: [
              {
                id: 74957,
                name: "Syncrophone",
                catno: "SYNCRO63"
              }
            ]
          }
        }
      ]
    }
  );

  assert.ok(
    graph.entities.some(
      entity =>
        entity.id === "release:discogs:33895134" &&
        entity.catalogueNumber === "SYNCRO63"
    )
  );

  assert.ok(
    graph.entities.some(
      entity =>
        entity.id === "artist:discogs:5927130" &&
        entity.name === "Kosh"
    )
  );

  assert.ok(
    graph.edges.some(
      edge =>
        edge.from === "artist:discogs:5927130" &&
        edge.to === "release:discogs:33895134" &&
        edge.kind === "credited_on_release"
    )
  );
});

test("graphFromResolution conserve l'identité artiste structurée d'une édition Discogs Love Love", () => {
  const graph = graphFromResolution(
    {
      id: "yt-love-love",
      title: "Si Begg - 400 Million Pieces Of You"
    },
    null,
    {
      discogsCandidates: [
        {
          source: "discogs",
          sourceId: "14218488",
          artists: ["Si Begg"],
          title: "400 Million Pieces Of You",
          version: "",
          catalogueCode: "LOVWAX09",
          corroborates: true,
          evidence: {
            releaseId: "14218488",
            artistIds: ["340"],
            labelIds: [],
            resourceUrl:
              "https://api.discogs.com/releases/14218488",
            provenance: "discogs_release_or_search"
          },
          raw: {
            id: 14218488,
            title: "Si Begg - 400 Million Pieces Of You",
            year: 2019,
            country: "UK",
            artists: [
              {
                id: 340,
                name: "Si Begg"
              }
            ]
          }
        }
      ]
    }
  );

  assert.ok(
    graph.entities.some(
      entity =>
        entity.id === "artist:discogs:340" &&
        entity.externalIds?.discogs === "340"
    )
  );

  assert.ok(
    graph.edges.some(
      edge =>
        edge.from === "artist:discogs:340" &&
        edge.to === "release:discogs:14218488" &&
        edge.kind === "credited_on_release" &&
        edge.status === "observed"
    )
  );

  assert.ok(
    graph.entities.some(
      entity =>
        entity.id === "release:discogs:14218488" &&
        entity.catalogueNumber === "LOVWAX09"
    )
  );
});

test("graphFromResolution matérialise le label Discogs structuré d'une édition Love Love", () => {
  const graph = graphFromResolution(
    {
      id: "yt-love-love-label",
      title: "Si Begg - 400 Million Pieces Of You"
    },
    null,
    {
      discogsCandidates: [
        {
          source: "discogs",
          sourceId: "14218488",
          artists: ["Si Begg"],
          title: "400 Million Pieces Of You",
          catalogueCode: "LOVWAX09",
          corroborates: true,
          evidence: {
            releaseId: "14218488",
            artistIds: ["340"],
            labelIds: ["140604"],
            resourceUrl:
              "https://api.discogs.com/releases/14218488",
            provenance: "discogs_release_or_search"
          },
          raw: {
            id: 14218488,
            title: "400 Million Pieces Of You",
            year: 2019,
            released: "2019-09-00",
            artists: [
              {
                id: 340,
                name: "Si Begg"
              }
            ],
            labels: [
              {
                id: 140604,
                name: "Love Love Records",
                catno: "LOVWAX09"
              }
            ]
          }
        }
      ]
    }
  );

  assert.ok(
    graph.entities.some(
      entity =>
        entity.id === "label:discogs:140604" &&
        entity.name === "Love Love Records" &&
        entity.externalIds?.discogs === "140604"
    )
  );

  assert.ok(
    graph.edges.some(
      edge =>
        edge.from === "release:discogs:14218488" &&
        edge.to === "label:discogs:140604" &&
        edge.kind === "issued_by" &&
        edge.catalogueNumber === "LOVWAX09"
    )
  );
});
