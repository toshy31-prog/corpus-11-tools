import test from "node:test";
import assert from "node:assert/strict";
import { catalogueCandidates, discogsReleaseGraph, musicBrainzReleaseGraph, exploreCatalogueBranch, releaseDates, bandcampEvidenceGraph, diversifyCatalogueReleases } from "./catalogue.mjs";

function merge(...deltas) {
  const graph = { entities: {}, edges: {} };
  for (const delta of deltas) {
    for (const node of delta.entities || []) graph.entities[node.id] = { ...(graph.entities[node.id] || {}), ...node };
    for (const edge of delta.edges || []) graph.edges[`${edge.from}:${edge.kind}:${edge.to}`] = edge;
  }
  return graph;
}

const release = (id, artistId, title, labelId = 77) => ({ id, title, artists: [{ id: artistId, name: `Artist ${artistId}` }], labels: [{ id: labelId, name: `Label ${labelId}` }], tracklist: [{ title: `${title} track`, position: "A1", type_: "track" }], year: 2023 });

test("label follows an exact label to another artist and never substitutes the source artist", () => {
  const graph = merge(discogsReleaseGraph(release(1, 10, "Seed")), discogsReleaseGraph(release(2, 20, "Discovery")), discogsReleaseGraph(release(3, 10, "Same artist other label", 88)));
  const candidates = catalogueCandidates(graph, "artist:discogs:10", "label");
  assert.deepEqual(candidates.map(({ title }) => title), ["Discovery track"]);
  assert.equal(candidates[0].anchor.id, "label:discogs:77");
  assert.equal(candidates[0].path.filter(({ relation }) => relation === "issued_by").length, 2);
  assert.equal(candidates[0].listen.kind, "search");
  assert.match(candidates[0].listen.query, /Artist 20 Discovery track/);
});

test("broad-label metadata is explicit and size-based, not an artist blacklist", () => {
  const graph = merge(discogsReleaseGraph(release(1, 10, "Seed")), discogsReleaseGraph(release(2, 20, "Discovery")));
  for (const [catalogueSize, distant] of [[undefined,false],[499,false],[500,true],[10000,true]]) {
    graph.entities['label:discogs:77'].catalogueSize = catalogueSize;
    const [candidate] = catalogueCandidates(graph, 'artist:discogs:10', 'label');
    assert.equal(candidate.relationship.distant, distant);
    assert.equal(candidate.releaseId, 'release:discogs:2');
    assert.match(candidate.relationship.message, /proximité musicale non établie/);
    assert.equal(candidate.path.length, 4);
  }
});

test("collection diversity orders artists and editions without deleting or merging them", () => {
  const items = [{id:'1',artist:'A',title:'Album'}, {id:'2',artist:'A',title:'Album'}, {id:'3',artist:'B',title:'Next'}, {id:'4',artist:'C',title:'Other'}];
  const result = diversifyCatalogueReleases(items);
  assert.deepEqual(result.map(item => item.id), ['1','3','4','2']);
  assert.deepEqual(items.map(item => item.id), ['1','2','3','4']);
});

test("remix follows the track's credited remixer into that artist's catalogue", () => {
  const seed = release(1, 10, "Seed");
  seed.tracklist[0].extraartists = [{ id: 30, name: "Remixer", role: "Remix" }];
  const graph = merge(discogsReleaseGraph(seed), discogsReleaseGraph(release(2, 30, "Remixer next")), discogsReleaseGraph(release(3, 20, "Unrelated")));
  const candidates = catalogueCandidates(graph, "artist:discogs:10", "remix");
  assert.ok(candidates.some(({ title }) => title === "Remixer next track"));
  assert.ok(candidates.every(({ path }) => path.some(({ relation }) => relation === "remixed_by")));
  assert.ok(candidates.every(({ title }) => title !== "Unrelated track"));
});

test("a shared release without a featuring credit does not invent a partner", () => {
  const graph = merge(discogsReleaseGraph(release(1, 10, "Seed")), discogsReleaseGraph(release(2, 20, "Other")));
  assert.deepEqual(catalogueCandidates(graph, "artist:discogs:10", "featuring"), []);
});

test("local graph results perform no network requests and keep provider pages resumable", async () => {
  const graph = merge(discogsReleaseGraph(release(1, 10, "Seed")), discogsReleaseGraph(release(2, 20, "Discovery")));
  let calls = 0;
  const result = await exploreCatalogueBranch({ graph, seedId: "artist:discogs:10", direction: "label", configured: { discogs: true }, request: async () => { calls++; throw new Error("not expected"); } });
  assert.equal(calls, 0);
  assert.equal(result.candidates[0].title, "Discovery track");
  assert.ok(result.coverage.nextCursor);
});

test("remote label expansion discovers exact label IDs then other catalogue artists across resumable requests", async () => {
  let graph = merge({ entities: [{ id: "canonical:artist", type: "artist", name: "Artist 10", externalIds: { discogs: "10" } }, { id: "label:discogs-name:label-77", type: "label", name: "Label 77" }], edges: [{ from: "canonical:artist", to: "label:discogs-name:label-77", kind: "associated_label", status: "observed" }] });
  const requested = [];
  const request = async (source, resource) => {
    requested.push(resource);
    if (resource === "/artists/10") return { id: 10, name: "Artist 10" };
    if (resource === "/artists/10/releases") return { releases: [{ id: 1, type: "release" }], pagination: { pages: 1 } };
    if (resource === "/releases/1") return release(1, 10, "Seed");
    if (resource === "/labels/77/releases") return { releases: [{ id: 1 }, { id: 2 }], pagination: { pages: 1 } };
    if (resource === "/releases/2") return release(2, 20, "Discovery");
    throw new Error(`Unexpected ${resource}`);
  };
  let cursor = "", collected = [];
  for (let attempt = 0; attempt < 6; attempt++) {
    const result = await exploreCatalogueBranch({ graph, seedId: "canonical:artist", direction: "label", cursor, configured: { discogs: true }, request, requestBudget: 2 });
    graph = merge({ entities: Object.values(graph.entities), edges: Object.values(graph.edges) }, result.graphDelta);
    collected.push(...result.candidates);
    cursor = result.coverage.nextCursor;
    if (!cursor) break;
  }
  assert.ok(requested.includes("/labels/77/releases"));
  assert.ok(collected.some(({ title }) => title === "Discovery track"));
  assert.ok(collected.every(({ artist }) => artist !== "Artist 10"));
  assert.equal(requested.filter((path) => path === "/releases/1").length, 1);
});

test("provider failures remain retryable and never report exhaustion", async () => {
  const graph = merge({ entities: [{ id: "label:discogs:77", type: "label", name: "Label", externalIds: { discogs: "77" } }] });
  const result = await exploreCatalogueBranch({ graph, seedId: "label:discogs:77", direction: "label", configured: { discogs: true }, request: async () => { throw new Error("429 rate limited"); } });
  assert.equal(result.status, "source_unavailable");
  assert.equal(result.coverage.sourceStates.discogs, "rate_limited");
  assert.ok(result.coverage.nextCursor);
  assert.equal(result.coverage.pendingPages, 1);
});

test("recording dates distinguish first release, reissue, announcement and unknown dates", () => {
  const now = "2026-09-13T00:00:00Z";
  assert.equal(releaseDates({ date: "2026-10-01", now }).status, "announced");
  assert.equal(releaseDates({ date: "2026", now }).status, "released");
  const result = releaseDates({ date: "2024-03-12", originalDate: "1993", formats: ["Reissue"], now });
  assert.equal(result.firstReleaseDate, "1993");
  assert.equal(result.isReissue, true);
  assert.equal(releaseDates({ now }).status, "unknown");
});

test("MusicBrainz exact track credit and label IDs are retained; homonyms stay separate", () => {
  const graph = musicBrainzReleaseGraph({ id: "release-1", title: "Album", date: "2023-05-01", "release-group": { "first-release-date": "2001", "secondary-types": ["Compilation"] }, "label-info": [{ label: { id: "label-1", name: "Label" } }], media: [{ tracks: [{ recording: { id: "recording-1", title: "Track", "artist-credit": [{ artist: { id: "artist-1", name: "Alex" } }, { artist: { id: "artist-2", name: "Alex" } }], relations: [{ "target-type": "artist", type: "remixer", artist: { id: "artist-3", name: "Mixer" } }] } }] }] });
  assert.equal(graph.entities.filter(({ name }) => name === "Alex").length, 2);
  assert.ok(graph.edges.some(({ kind, to }) => kind === "issued_by" && to === "label:musicbrainz:label-1"));
  assert.ok(graph.edges.some(({ kind }) => kind === "remixed_by"));
  assert.ok(graph.edges.some(({ kind }) => kind === "released_in_era"));
  assert.equal(graph.entities.find(({ type }) => type === "release").dates.original, "2001");
});

test("Bandcamp supplied imports are labelled and cannot merge artists by a label subdomain", () => {
  const one = bandcampEvidenceGraph({ sourceUrl: "https://label.bandcamp.com/album/one", artist: "One", title: "Album One", tracks: [{ title: "Track" }], releaseDate: "2024" });
  const two = bandcampEvidenceGraph({ sourceUrl: "https://label.bandcamp.com/album/two", artist: "Two", title: "Album Two" });
  assert.notEqual(one.entities.find(({ type }) => type === "artist").id, two.entities.find(({ type }) => type === "artist").id);
  assert.ok(one.edges.every(({ source }) => source === "user_supplied"));
  assert.throws(() => bandcampEvidenceGraph({ sourceUrl: "https://bandcamp.com.evil.test/album/test", artist: "A", title: "B" }), /Bandcamp/);
});

test("cursor is scoped to its seed and direction", async () => {
  const graph = merge(discogsReleaseGraph(release(1, 10, "Seed")), discogsReleaseGraph(release(2, 20, "Discovery")));
  const result = await exploreCatalogueBranch({ graph, seedId: "artist:discogs:10", direction: "label", configured: { discogs: true } });
  await assert.rejects(exploreCatalogueBranch({ graph, seedId: "artist:discogs:10", direction: "featuring", cursor: result.coverage.nextCursor }), /Curseur/);
});

test("a single-source probable artist asks for explicit confirmation without querying its catalogue", async () => {
  const mbid = "72201156-6e63-4ab5-86e0-460a204a130c";
  const graph = merge({ entities: [{ id: "video:youtube:WHj1EPkWXDY", type: "video", title: "Art of Tones - Violation" }, { id: `mbid:${mbid}`, type: "artist", name: "Art of Tones", externalIds: { musicbrainz: mbid } }], edges: [{ from: "video:youtube:WHj1EPkWXDY", to: `mbid:${mbid}`, kind: "probable_artist", status: "single_source" }] });
  let requests = 0;
  const result = await exploreCatalogueBranch({ graph, seedId: "video:youtube:WHj1EPkWXDY", direction: "label", request: async () => { requests++; throw new Error("Must not be called"); } });
  assert.equal(requests, 0);
  assert.equal(result.coverage.state, "needs_confirmation");
  assert.equal(result.coverage.complete, false);
  assert.deepEqual(result.confirmationCandidates, [{ id: `mbid:${mbid}`, name: "Art of Tones", source: "musicbrainz", sourceId: mbid, sourceUrl: `https://musicbrainz.org/artist/${mbid}` }]);
  assert.match(result.coverage.message, /Confirmez/);
});

test("an unidentified seed requests enrichment rather than falsely reporting a finished catalogue", async () => {
  const graph = merge({ entities: [{ id: "video:youtube:unidentified", type: "video", title: "Unknown song" }, { id: "artist:local:unknown", type: "artist", name: "Unknown artist" }], edges: [{ from: "video:youtube:unidentified", to: "artist:local:unknown", kind: "probable_artist", status: "local_hypothesis" }] });
  const result = await exploreCatalogueBranch({ graph, seedId: "video:youtube:unidentified", direction: "label", request: async () => { throw new Error("Must not be called"); } });
  assert.equal(result.coverage.state, "needs_enrichment");
  assert.equal(result.coverage.complete, false);
  assert.equal(result.coverage.fetchedRequests, 0);
  assert.deepEqual(result.confirmationCandidates, []);
  assert.match(result.coverage.message, /Identifiez/);
});

test("a confirmed artist path does not ask to confirm a second single-source alternative", async () => {
  const graph = merge(discogsReleaseGraph(release(1, 10, "Seed")), discogsReleaseGraph(release(2, 20, "Discovery")), { entities: [{ id: "video:youtube:seed", type: "video", title: "Seed" }, { id: "artist:discogs:99", type: "artist", name: "Alternative", externalIds: { discogs: "99" } }], edges: [{ from: "video:youtube:seed", to: "artist:discogs:10", kind: "probable_artist", status: "confirmed_user" }, { from: "video:youtube:seed", to: "artist:discogs:99", kind: "probable_artist", status: "single_source" }] });
  const result = await exploreCatalogueBranch({ graph, seedId: "video:youtube:seed", direction: "label", configured: { discogs: true } });
  assert.deepEqual(result.confirmationCandidates, []);
  assert.equal(result.candidates[0].title, "Discovery track");
});

test("structured artist URLs connect MusicBrainz and Discogs IDs in both directions without name matching", async () => {
  const mbid = "72201156-6e63-4ab5-86e0-460a204a130c";
  for (const source of ["musicbrainz", "discogs"]) {
    const externalId = source === "musicbrainz" ? mbid : "10";
    const graph = merge({ entities: [{ id: "canonical:artist", type: "artist", name: "Known artist", externalIds: { [source]: externalId } }] });
    const artist = source === "musicbrainz"
      ? { id: mbid, name: "Name from MB", relations: [{ "target-type": "url", type: "discogs", url: { resource: "https://www.discogs.com/artist/10-Different-Spelling" } }, { "target-type": "url", url: { resource: "https://www.discogs.com.evil.test/artist/99" } }] }
      : { id: 10, name: "Name from Discogs", urls: [`https://musicbrainz.org/artist/${mbid}`, "https://musicbrainz.org/release/12345678-1234-1234-1234-123456789abc"] };
    const result = await exploreCatalogueBranch({ graph, seedId: "canonical:artist", direction: "alias", configured: { discogs: true }, requestBudget: 1, request: async () => artist });
    const edge = result.graphDelta.edges.find((entry) => entry.kind === "same_identity" && entry.from === `artist:${source}:${externalId}`);
    assert.equal(edge?.status, "confirmed_cross_id");
    assert.equal(edge.to, source === "musicbrainz" ? "artist:discogs:10" : `artist:musicbrainz:${mbid}`);
    assert.equal(edge.evidence[0].basis, "structured_artist_url");
    assert.ok(edge.evidence[0].relatedUrl.startsWith("https://"));
    assert.ok(result.graphDelta.entities.every(({ id }) => !id.includes(":99")));
  }
});

test("a failed catalogue source keeps its cursor page but another available source continues in the same request", async () => {
  const mbid = "72201156-6e63-4ab5-86e0-460a204a130c";
  const graph = merge({ entities: [{ id: "canonical:artist", type: "artist", name: "Artist", externalIds: { discogs: "10", musicbrainz: mbid } }] });
  const calls = [];
  const result = await exploreCatalogueBranch({ graph, seedId: "canonical:artist", direction: "label", configured: { discogs: true }, requestBudget: 3, request: async (source, resource) => {
    calls.push({ source, resource });
    if (source === "discogs") throw new Error("Discogs 429 rate limit");
    if (resource.startsWith("artist/")) return { id: mbid, name: "Artist" };
    return { releases: [], "release-count": 0 };
  } });
  assert.equal(calls.filter(({ source }) => source === "discogs").length, 1);
  assert.equal(calls.filter(({ source }) => source === "musicbrainz").length, 2);
  assert.equal(result.coverage.sourceStates.discogs, "rate_limited");
  assert.equal(result.coverage.sourceStates.musicbrainz, "ok");
  assert.equal(result.coverage.complete, false);
  const pending = JSON.parse(Buffer.from(result.coverage.nextCursor, "base64url").toString("utf8"));
  assert.ok(pending.queue.some(({ source, type }) => source === "discogs" && type === "artist"));
});

test("a label route produces a different artist track within five calls before collecting the seed's remaining albums", async () => {
  const graph = merge({ entities: [{ id: "artist:discogs:10", type: "artist", name: "Artist 10", externalIds: { discogs: "10" } }] });
  const calls = [];
  const result = await exploreCatalogueBranch({ graph, seedId: "artist:discogs:10", direction: "label", configured: { discogs: true }, requestBudget: 5, request: async (source, resource, parameters) => {
    calls.push(`${resource}:${parameters.page || 1}`);
    if (resource === "/artists/10") return { id: 10, name: "Artist 10" };
    if (resource === "/artists/10/releases") return { releases: Array.from({ length: 8 }, (_, index) => ({ id: index + 1, type: "release" })), pagination: { pages: 100 } };
    if (resource === "/releases/1") return release(1, 10, "Seed");
    if (resource === "/labels/77/releases") return { releases: [{ id: 1 }, { id: 200 }, { id: 201 }], pagination: { pages: 50 } };
    if (resource === "/releases/200") return release(200, 20, "First discovery");
    throw new Error(`The next useful step was delayed by ${resource}`);
  } });
  assert.deepEqual(calls, ["/artists/10:1", "/artists/10/releases:1", "/releases/1:1", "/labels/77/releases:1", "/releases/200:1"]);
  assert.equal(result.coverage.fetchedRequests, 5);
  assert.equal(result.candidates[0].title, "First discovery track");
  assert.equal(result.candidates[0].artist, "Artist 20");
  assert.equal(result.candidates[0].anchor.id, "label:discogs:77");
  const pending = JSON.parse(Buffer.from(result.coverage.nextCursor, "base64url").toString("utf8"));
  assert.ok(pending.queue.some((task) => task.type === "artist_releases" && task.page === 2));
  assert.ok(pending.queue.some((task) => task.type === "label" && task.page === 2));
});

test("les zéros de date fournisseur dégradent la précision au lieu d'inventer un jour ou un mois", () => {
  const now = "2026-09-14T12:00:00.000Z";

  const month = releaseDates({
    date: "2019-09-00",
    now
  });

  assert.equal(month.releaseDate, "2019-09");
  assert.equal(month.precision, "month");
  assert.equal(month.status, "released");

  const yearFromFull = releaseDates({
    date: "2019-00-00",
    now
  });

  assert.equal(yearFromFull.releaseDate, "2019");
  assert.equal(yearFromFull.precision, "year");
  assert.equal(yearFromFull.status, "released");

  const yearFromMonth = releaseDates({
    date: "2019-00",
    now
  });

  assert.equal(yearFromMonth.releaseDate, "2019");
  assert.equal(yearFromMonth.precision, "year");

  const exact = releaseDates({
    date: "2019-09-23",
    now
  });

  assert.equal(exact.releaseDate, "2019-09-23");
  assert.equal(exact.precision, "day");
});

test("un profil MusicBrainz de label matérialise un cross-ID Discogs structuré sans comparaison de nom", async () => {
  const mbid = "9d15091c-8362-48da-8b4d-be4986bead1f";

  const graph = merge({
    entities: [
      {
        id: `label:musicbrainz:${mbid}`,
        type: "label",
        name: "Nom MB volontairement différent",
        externalIds: {
          musicbrainz: mbid
        },
        source: "musicbrainz"
      }
    ],
    edges: [
      {
        from: "release:musicbrainz:seed",
        to: `label:musicbrainz:${mbid}`,
        kind: "issued_by",
        status: "observed"
      }
    ]
  });

  const requested = [];

  const result = await exploreCatalogueBranch({
    graph,
    seedId: `label:musicbrainz:${mbid}`,
    direction: "label",
    configured: {
      discogs: true
    },
    requestBudget: 1,
    request: async (source, resource) => {
      requested.push({ source, resource });

      assert.equal(source, "musicbrainz");
      assert.equal(resource, `label/${mbid}`);

      return {
        id: mbid,
        name: "Nom MB volontairement différent",
        relations: [
          {
            "target-type": "url",
            type: "discogs",
            url: {
              resource: "https://www.discogs.com/label/27115-Noodles-Recordings"
            }
          }
        ]
      };
    }
  });

  assert.ok(
    requested.some(
      entry =>
        entry.source === "musicbrainz" &&
        entry.resource === `label/${mbid}`
    )
  );

  assert.ok(
    result.graphDelta.entities.some(
      entity =>
        entity.id === "label:discogs:27115" &&
        entity.externalIds?.discogs === "27115"
    )
  );

  const edge = result.graphDelta.edges.find(
    edge =>
      edge.from === `label:musicbrainz:${mbid}` &&
      edge.to === "label:discogs:27115" &&
      edge.kind === "same_identity"
  );

  assert.equal(edge?.status, "confirmed_cross_id");
  assert.equal(edge?.evidence?.[0]?.basis, "structured_label_url");
});

test("un cross-ID structuré ne peut jamais changer de type d'entité", async () => {
  const mbid = "9d15091c-8362-48da-8b4d-be4986bead1f";

  const graph = merge({
    entities: [
      {
        id: `label:musicbrainz:${mbid}`,
        type: "label",
        name: "Label",
        externalIds: {
          musicbrainz: mbid
        }
      }
    ],
    edges: [
      {
        from: "release:musicbrainz:seed",
        to: `label:musicbrainz:${mbid}`,
        kind: "issued_by",
        status: "observed"
      }
    ]
  });

  const result = await exploreCatalogueBranch({
    graph,
    seedId: `label:musicbrainz:${mbid}`,
    direction: "label",
    configured: {
      discogs: true
    },
    requestBudget: 1,
    request: async () => ({
      id: mbid,
      name: "Label",
      relations: [
        {
          "target-type": "url",
          type: "discogs",
          url: {
            resource: "https://www.discogs.com/artist/27115"
          }
        }
      ]
    })
  });

  assert.equal(
    result.graphDelta.entities.some(
      entity => entity.id === "artist:discogs:27115"
    ),
    false
  );

  assert.equal(
    result.graphDelta.edges.some(
      edge =>
        edge.kind === "same_identity" &&
        edge.to.includes("27115")
    ),
    false
  );
});

test("un faux domaine Discogs ne produit jamais de cross-ID label", async () => {
  const mbid = "9d15091c-8362-48da-8b4d-be4986bead1f";

  const graph = merge({
    entities: [
      {
        id: `label:musicbrainz:${mbid}`,
        type: "label",
        name: "Label",
        externalIds: {
          musicbrainz: mbid
        }
      }
    ],
    edges: [
      {
        from: "release:musicbrainz:seed",
        to: `label:musicbrainz:${mbid}`,
        kind: "issued_by",
        status: "observed"
      }
    ]
  });

  const result = await exploreCatalogueBranch({
    graph,
    seedId: `label:musicbrainz:${mbid}`,
    direction: "label",
    configured: {
      discogs: true
    },
    requestBudget: 1,
    request: async () => ({
      id: mbid,
      name: "Label",
      relations: [
        {
          "target-type": "url",
          type: "discogs",
          url: {
            resource: "https://www.discogs.com.evil.test/label/27115"
          }
        }
      ]
    })
  });

  assert.equal(
    result.graphDelta.entities.some(
      entity => entity.id === "label:discogs:27115"
    ),
    false
  );
});

test("Noodles Recordings traverse son URL structurée MB vers Discogs sans utiliser le nom comme preuve", async () => {
  const mbid = "9d15091c-8362-48da-8b4d-be4986bead1f";

  const graph = merge({
    entities: [
      {
        id: `label:musicbrainz:${mbid}`,
        type: "label",
        name: "Noodles Recordings",
        externalIds: {
          musicbrainz: mbid
        },
        source: "musicbrainz"
      }
    ],
    edges: [
      {
        from: "release:musicbrainz:noodles-seed",
        to: `label:musicbrainz:${mbid}`,
        kind: "issued_by",
        status: "observed"
      }
    ]
  });

  const result = await exploreCatalogueBranch({
    graph,
    seedId: `label:musicbrainz:${mbid}`,
    direction: "label",
    configured: {
      discogs: true
    },
    requestBudget: 1,
    request: async (source, resource) => {
      assert.equal(source, "musicbrainz");
      assert.equal(resource, `label/${mbid}`);

      return {
        id: mbid,
        name: "Noodles Recordings",
        country: "GB",
        relations: [
          {
            "target-type": "url",
            type: "discogs",
            direction: "forward",
            url: {
              resource: "https://www.discogs.com/label/27115"
            }
          }
        ]
      };
    }
  });

  const cross = result.graphDelta.edges.find(
    edge =>
      edge.from === `label:musicbrainz:${mbid}` &&
      edge.to === "label:discogs:27115" &&
      edge.kind === "same_identity"
  );

  assert.equal(cross?.status, "confirmed_cross_id");
  assert.equal(
    cross?.evidence?.[0]?.relatedUrl,
    "https://www.discogs.com/label/27115"
  );
  assert.equal(
    cross?.evidence?.[0]?.basis,
    "structured_label_url"
  );
});

test("un cross-ID artiste structuré découvert en fouille ouvre automatiquement l'autre fournisseur", async () => {
  const mbid = "11111111-1111-1111-1111-111111111111";

  let graph = merge({
    entities: [
      {
        id: `artist:musicbrainz:${mbid}`,
        type: "artist",
        name: "Bridge Artist",
        externalIds: {
          musicbrainz: mbid
        },
        source: "musicbrainz"
      }
    ],
    edges: []
  });

  const calls = [];

  const result = await exploreCatalogueBranch({
    graph,
    seedId: `artist:musicbrainz:${mbid}`,
    direction: "alias",
    configured: {
      discogs: true
    },
    requestBudget: 1,
    request: async (source, resource) => {
      calls.push({ source, resource });

      assert.equal(source, "musicbrainz");
      assert.equal(resource, `artist/${mbid}`);

      return {
        id: mbid,
        name: "Bridge Artist",
        relations: [
          {
            "target-type": "url",
            type: "discogs",
            url: {
              resource: "https://www.discogs.com/artist/4242-Other-Spelling"
            }
          }
        ]
      };
    }
  });

  assert.ok(
    result.graphDelta.entities.some(
      entity =>
        entity.id === "artist:discogs:4242" &&
        entity.externalIds?.discogs === "4242"
    )
  );

  assert.ok(
    result.graphDelta.edges.some(
      edge =>
        edge.from === `artist:musicbrainz:${mbid}` &&
        edge.to === "artist:discogs:4242" &&
        edge.kind === "same_identity" &&
        edge.status === "confirmed_cross_id"
    )
  );

  assert.equal(calls.length, 1);
});

test("un cross-ID label structuré découvert pendant la fouille rend l'identité Discogs praticable", async () => {
  const mbid = "9d15091c-8362-48da-8b4d-be4986bead1f";

  let graph = merge({
    entities: [
      {
        id: `label:musicbrainz:${mbid}`,
        type: "label",
        name: "Noodles Recordings",
        externalIds: {
          musicbrainz: mbid
        },
        source: "musicbrainz"
      }
    ],
    edges: [
      {
        from: "release:musicbrainz:seed",
        to: `label:musicbrainz:${mbid}`,
        kind: "issued_by",
        status: "observed"
      }
    ]
  });

  const requested = [];

  const request = async (source, resource) => {
    requested.push({ source, resource });

    if (
      source === "musicbrainz" &&
      resource === `label/${mbid}`
    ) {
      return {
        id: mbid,
        name: "Noodles Recordings",
        relations: [
          {
            "target-type": "url",
            type: "discogs",
            url: {
              resource: "https://www.discogs.com/label/27115"
            }
          }
        ]
      };
    }

    throw new Error(`Unexpected ${source} ${resource}`);
  };

  const result = await exploreCatalogueBranch({
    graph,
    seedId: `label:musicbrainz:${mbid}`,
    direction: "label",
    configured: {
      discogs: true
    },
    requestBudget: 1,
    request
  });

  assert.ok(
    result.graphDelta.entities.some(
      entity =>
        entity.id === "label:discogs:27115" &&
        entity.externalIds?.discogs === "27115"
    )
  );

  assert.ok(
    result.graphDelta.edges.some(
      edge =>
        edge.from === `label:musicbrainz:${mbid}` &&
        edge.to === "label:discogs:27115" &&
        edge.kind === "same_identity" &&
        edge.status === "confirmed_cross_id"
    )
  );

  assert.deepEqual(
    requested.map(entry => `${entry.source}:${entry.resource}`),
    [
      `musicbrainz:label/${mbid}`
    ]
  );
});

test("une release détaillée rend automatiquement ses nouvelles identités structurées exploitables", () => {
  const delta = discogsReleaseGraph({
    id: 5000,
    title: "Unknown EP",
    released: "2024-00-00",
    artists: [
      {
        id: 700,
        name: "Unknown Artist"
      }
    ],
    labels: [
      {
        id: 800,
        name: "Unknown Label",
        catno: "UNK001"
      }
    ],
    tracklist: [
      {
        type_: "track",
        position: "A1",
        title: "Unknown Track"
      }
    ]
  });

  assert.ok(
    delta.entities.some(
      entity =>
        entity.id === "artist:discogs:700" &&
        entity.externalIds?.discogs === "700"
    )
  );

  assert.ok(
    delta.entities.some(
      entity =>
        entity.id === "label:discogs:800" &&
        entity.externalIds?.discogs === "800"
    )
  );

  assert.ok(
    delta.edges.some(
      edge =>
        edge.from === "artist:discogs:700" &&
        edge.to === "release:discogs:5000" &&
        edge.kind === "credited_on_release"
    )
  );

  assert.ok(
    delta.edges.some(
      edge =>
        edge.from === "release:discogs:5000" &&
        edge.to === "label:discogs:800" &&
        edge.kind === "issued_by" &&
        edge.catalogueNumber === "UNK001"
    )
  );

  const release = delta.entities.find(
    entity => entity.id === "release:discogs:5000"
  );

  assert.equal(release.date, "2024");
  assert.equal(release.dates.precision, "year");
});

test("un même nom sans pont structuré ne crée jamais une nouvelle identité praticable", async () => {
  const mbid = "22222222-2222-2222-2222-222222222222";

  const graph = merge({
    entities: [
      {
        id: `artist:musicbrainz:${mbid}`,
        type: "artist",
        name: "Collision Artist",
        externalIds: {
          musicbrainz: mbid
        }
      },
      {
        id: "artist:discogs:999",
        type: "artist",
        name: "Collision Artist",
        externalIds: {
          discogs: "999"
        }
      }
    ],
    edges: []
  });

  const result = await exploreCatalogueBranch({
    graph,
    seedId: `artist:musicbrainz:${mbid}`,
    direction: "alias",
    configured: {
      discogs: true
    },
    requestBudget: 1,
    request: async () => ({
      id: mbid,
      name: "Collision Artist",
      relations: []
    })
  });

  assert.equal(
    result.graphDelta.edges.some(
      edge =>
        edge.kind === "same_identity" &&
        (
          edge.to === "artist:discogs:999" ||
          edge.from === "artist:discogs:999"
        )
    ),
    false
  );
});


test("un cross-ID label découvert replanifie le même parcours et ouvre automatiquement le catalogue Discogs", async () => {
  const mbid = "9d15091c-8362-48da-8b4d-be4986bead1f";

  let graph = merge({
    entities: [
      {
        id: `label:musicbrainz:${mbid}`,
        type: "label",
        name: "Noodles Recordings",
        externalIds: {
          musicbrainz: mbid
        },
        source: "musicbrainz"
      }
    ],
    edges: []
  });

  const calls = [];

  const request = async (source, resource) => {
    calls.push(`${source}:${resource}`);

    if (
      source === "musicbrainz" &&
      resource === `label/${mbid}`
    ) {
      return {
        id: mbid,
        name: "Noodles Recordings",
        relations: [
          {
            "target-type": "url",
            type: "discogs",
            url: {
              resource: "https://www.discogs.com/label/27115"
            }
          }
        ]
      };
    }

    if (
      source === "musicbrainz" &&
      resource === "release"
    ) {
      return {
        releases: [],
        "release-count": 0
      };
    }

    if (
      source === "discogs" &&
      resource === "/labels/27115/releases"
    ) {
      return {
        releases: [
          {
            id: 5001,
            type: "release"
          }
        ],
        pagination: {
          pages: 1
        }
      };
    }

    if (
      source === "discogs" &&
      resource === "/releases/5001"
    ) {
      return {
        id: 5001,
        title: "Discovered Through Cross ID",
        year: 2024,
        released: "2024-05-00",
        artists: [
          {
            id: 7001,
            name: "Other Artist"
          }
        ],
        labels: [
          {
            id: 27115,
            name: "Noodles Recordings",
            catno: "NOODTEST"
          }
        ],
        tracklist: [
          {
            type_: "track",
            position: "A1",
            title: "Cross Provider Track"
          }
        ]
      };
    }

    throw new Error(`Unexpected ${source} ${resource}`);
  };

  let cursor = "";
  let found = [];

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const result = await exploreCatalogueBranch({
      graph,
      seedId: `label:musicbrainz:${mbid}`,
      direction: "label",
      cursor,
      configured: {
        discogs: true
      },
      request,
      requestBudget: 2
    });

    graph = merge(
      {
        entities: Object.values(graph.entities),
        edges: Object.values(graph.edges)
      },
      result.graphDelta
    );

    found.push(...result.candidates);
    cursor = result.coverage.nextCursor || "";

    if (
      found.some(
        candidate => candidate.title === "Cross Provider Track"
      )
    ) {
      break;
    }

    if (!cursor) break;
  }

  assert.ok(
    calls.includes(`musicbrainz:label/${mbid}`)
  );

  assert.ok(
    calls.includes("discogs:/labels/27115/releases")
  );

  assert.ok(
    calls.includes("discogs:/releases/5001")
  );

  assert.ok(
    found.some(
      candidate =>
        candidate.title === "Cross Provider Track" &&
        candidate.artist === "Other Artist"
    )
  );
});
