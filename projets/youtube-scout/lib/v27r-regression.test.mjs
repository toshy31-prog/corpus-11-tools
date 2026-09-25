import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  buildSeedCatalog,
  projectActiveCollectionGraph
} from "./exploration.mjs";

import { journeyGuidance } from "../public/journey-state.mjs";

const activeLibrary = [
  {
    id: "active",
    title: "Artist - Track",
    artist: "Artist",
    playlistIds: ["current"],
    playlistNames: ["Current"]
  }
];

function graphWith(edges = {}, entities = {}) {
  return { entities, edges };
}

test("V2.7R2: un label d'une édition exacte du morceau actif entre dans le picker", () => {
  const state = graphWith(
    {
      embodies: {
        from: "video:youtube:active",
        to: "recording:musicbrainz:r",
        kind: "embodies",
        status: "resolved"
      },
      appears: {
        from: "recording:musicbrainz:r",
        to: "release:musicbrainz:rel",
        kind: "appears_on",
        status: "observed"
      },
      imprint: {
        from: "release:musicbrainz:rel",
        to: "label:musicbrainz:lab",
        kind: "issued_by",
        status: "observed"
      }
    },
    {
      "recording:musicbrainz:r": {
        id: "recording:musicbrainz:r",
        type: "recording",
        title: "Track"
      },
      "release:musicbrainz:rel": {
        id: "release:musicbrainz:rel",
        type: "release",
        title: "Release"
      },
      "label:musicbrainz:lab": {
        id: "label:musicbrainz:lab",
        type: "label",
        name: "Mechatronica"
      }
    }
  );

  const projected =
    projectActiveCollectionGraph(state, activeLibrary);

  assert.ok(projected.entities["label:musicbrainz:lab"]);

  const seeds =
    buildSeedCatalog(projected, activeLibrary);

  assert.equal(
    seeds.label.some(({ label }) => label === "Mechatronica"),
    true
  );
});

test("V2.7R2: candidate_edition ne traverse la frontière qu'une fois corroborée", () => {
  const baseEntities = {
    "recording:musicbrainz:r": {
      id: "recording:musicbrainz:r",
      type: "recording",
      title: "Track"
    },
    "release:discogs:rel": {
      id: "release:discogs:rel",
      type: "release",
      title: "Release"
    },
    "label:discogs:lab": {
      id: "label:discogs:lab",
      type: "label",
      name: "Strict Label"
    }
  };

  const make = (status) => graphWith(
    {
      embodies: {
        from: "video:youtube:active",
        to: "recording:musicbrainz:r",
        kind: "embodies",
        status: "resolved"
      },
      edition: {
        from: "recording:musicbrainz:r",
        to: "release:discogs:rel",
        kind: "candidate_edition",
        status
      },
      imprint: {
        from: "release:discogs:rel",
        to: "label:discogs:lab",
        kind: "issued_by",
        status: "observed"
      }
    },
    baseEntities
  );

  assert.equal(
    Boolean(
      projectActiveCollectionGraph(
        make("candidate"),
        activeLibrary
      ).entities["label:discogs:lab"]
    ),
    false
  );

  assert.equal(
    Boolean(
      projectActiveCollectionGraph(
        make("corroborated"),
        activeLibrary
      ).entities["label:discogs:lab"]
    ),
    true
  );
});

test("V2.7R2: un label d'une vidéo historique absente ne revient pas dans le picker", () => {
  const state = graphWith(
    {
      embodies: {
        from: "video:youtube:history",
        to: "recording:musicbrainz:history",
        kind: "embodies",
        status: "resolved"
      },
      appears: {
        from: "recording:musicbrainz:history",
        to: "release:musicbrainz:history",
        kind: "appears_on",
        status: "observed"
      },
      imprint: {
        from: "release:musicbrainz:history",
        to: "label:musicbrainz:history",
        kind: "issued_by",
        status: "observed"
      }
    },
    {
      "video:youtube:history": {
        id: "video:youtube:history",
        type: "video",
        title: "Old"
      },
      "recording:musicbrainz:history": {
        id: "recording:musicbrainz:history",
        type: "recording"
      },
      "release:musicbrainz:history": {
        id: "release:musicbrainz:history",
        type: "release"
      },
      "label:musicbrainz:history": {
        id: "label:musicbrainz:history",
        type: "label",
        name: "Historical Label"
      }
    }
  );

  const projected =
    projectActiveCollectionGraph(state, activeLibrary);

  assert.equal(
    projected.entities["label:musicbrainz:history"],
    undefined
  );
});

test("V2.7R2: un artiste voisin ne donne pas toute sa discographie au picker", () => {
  const state = graphWith(
    {
      artist: {
        from: "video:youtube:active",
        to: "artist:musicbrainz:a",
        kind: "probable_artist",
        status: "confirmed_user"
      },
      discography: {
        from: "artist:musicbrainz:a",
        to: "release:musicbrainz:elsewhere",
        kind: "primary_artist",
        status: "observed"
      },
      imprint: {
        from: "release:musicbrainz:elsewhere",
        to: "label:musicbrainz:elsewhere",
        kind: "issued_by",
        status: "observed"
      }
    },
    {
      "artist:musicbrainz:a": {
        id: "artist:musicbrainz:a",
        type: "artist",
        name: "Artist"
      },
      "release:musicbrainz:elsewhere": {
        id: "release:musicbrainz:elsewhere",
        type: "release",
        title: "Other release"
      },
      "label:musicbrainz:elsewhere": {
        id: "label:musicbrainz:elsewhere",
        type: "label",
        name: "Career-only Label"
      }
    }
  );

  const projected =
    projectActiveCollectionGraph(state, activeLibrary);

  assert.ok(projected.entities["artist:musicbrainz:a"]);
  assert.equal(
    projected.entities["release:musicbrainz:elsewhere"],
    undefined
  );
  assert.equal(
    projected.entities["label:musicbrainz:elsewhere"],
    undefined
  );
});

test("V2.7R1: une résolution recording-first peut masquer les vieux candidats textuels faibles", () => {
  const seed = {
    id: "video:youtube:time",
    type: "track",
    label: '"Time Travel" - Nexxor - Statik Travel 21'
  };

  const artist = {
    id: "artist:musicbrainz:wrong",
    type: "artist",
    name: "Time Travel",
    externalIds: {
      musicbrainz: "11111111-1111-1111-1111-111111111111"
    }
  };

  const guidance = journeyGuidance({
    seed,
    graph: {
      entities: {
        [artist.id]: artist
      },
      edges: {
        weak: {
          from: seed.id,
          to: artist.id,
          kind: "probable_artist",
          status: "single_source"
        }
      }
    },
    groups: {
      label: {
        coverage: {
          state: "not_checked",
          complete: false
        }
      }
    },
    dossier: {
      state: "partial",
      suppressWeakIdentityCandidates: true
    }
  });

  assert.deepEqual(guidance.candidates, []);
});

test("V2.7R contract: recording-first, provenance bornée et cartes lisibles sont présents", () => {
  const app =
    readFileSync(
      new URL("../public/app.js", import.meta.url),
      "utf8"
    );

  const exploration =
    readFileSync(
      new URL("./exploration.mjs", import.meta.url),
      "utf8"
    );

  const css =
    readFileSync(
      new URL("../public/styles.css", import.meta.url),
      "utf8"
    );

  assert.match(app, /V2\.7R1 — RECORDING-FIRST IDENTIFICATION/);
  assert.match(app, /\(recording\?\.resolved \|\| recording\?\.resolvedDiscogsTrack\)\?\.artistCredits/);
  assert.doesNotMatch(
    app,
    /const artistName = video \? resolvedArtist\(video\)\?\.name \|\|/
  );

  assert.match(exploration, /V2\.7R2 — ACTIVE PROVENANCE PROJECTION/);
  assert.match(exploration, /edge\.kind === "candidate_edition"/);
  assert.match(exploration, /edge\.kind === "issued_by"/);

  assert.match(css, /V2\.7R — identity confirmation cards/);
  assert.match(css, /\.seed-action-choices > div > button/);
});
