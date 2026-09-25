import test from "node:test";
import assert from "node:assert/strict";

import { parseTrackExpression } from "./track-expression.mjs";

function compact(result) {
  return {
    status: result.status,
    title: result.title,
    artists: (result.artists || []).map(({ name, role }) => [name, role]),
    version: result.version?.label || null,
    catalogueCode: result.catalogueCode || null
  };
}

test("Artist - Title", () => {
  assert.deepEqual(
    compact(parseTrackExpression("Kangding Ray - Codex [ARA006]")),
    {
      status: "parsed",
      title: "Codex",
      artists: [["Kangding Ray", "primary"]],
      version: null,
      catalogueCode: "ARA006"
    }
  );
});

test("feat dans le bloc artiste", () => {
  assert.deepEqual(
    compact(
      parseTrackExpression(
        "Pye Corner Audio feat. Ian Rankin - The Breath Of Now (Official Video)"
      )
    ),
    {
      status: "parsed",
      title: "The Breath Of Now",
      artists: [
        ["Pye Corner Audio", "primary"],
        ["Ian Rankin", "featuring"]
      ],
      version: null,
      catalogueCode: null
    }
  );
});

test("collaboration X", () => {
  assert.deepEqual(
    compact(
      parseTrackExpression(
        "CRC X VC-118A - Last Night [TOMU04]"
      )
    ),
    {
      status: "parsed",
      title: "Last Night",
      artists: [
        ["CRC", "joint"],
        ["VC-118A", "joint"]
      ],
      version: null,
      catalogueCode: "TOMU04"
    }
  );
});

test("collaboration & et featuring", () => {
  assert.deepEqual(
    compact(
      parseTrackExpression(
        "Identified Patient & Sophie du Palais - Everything Is Done (ft. Lasznikoff)"
      )
    ),
    {
      status: "parsed",
      title: "Everything Is Done",
      artists: [
        ["Identified Patient", "joint"],
        ["Sophie du Palais", "joint"],
        ["Lasznikoff", "featuring"]
      ],
      version: null,
      catalogueCode: null
    }
  );
});

test("remixer explicite", () => {
  assert.deepEqual(
    compact(
      parseTrackExpression(
        "Peter Power - Jungle Work (Thomash Remix)"
      )
    ),
    {
      status: "parsed",
      title: "Jungle Work",
      artists: [
        ["Peter Power", "primary"],
        ["Thomash", "remixer"]
      ],
      version: "Thomash Remix",
      catalogueCode: null
    }
  );
});

test("plusieurs remixeurs", () => {
  assert.deepEqual(
    compact(
      parseTrackExpression(
        "Aleckat - Fundamentals (Handsdown & Leigh Boy Remix)"
      )
    ),
    {
      status: "parsed",
      title: "Fundamentals",
      artists: [
        ["Aleckat", "primary"],
        ["Handsdown", "remixer"],
        ["Leigh Boy", "remixer"]
      ],
      version: "Handsdown & Leigh Boy Remix",
      catalogueCode: null
    }
  );
});

test("un & dans un titre ne devient pas deux artistes", () => {
  const result = parseTrackExpression("Knights & Bishops");

  assert.equal(result.status, "partial");
  assert.equal(result.title, "Knights & Bishops");
  assert.deepEqual(result.artists, []);
});

test("ne déduit pas l'artiste d'un titre Topic sans frontière", () => {
  const result = parseTrackExpression("Eight Thousand Years");

  assert.equal(result.status, "partial");
  assert.equal(result.title, "Eight Thousand Years");
  assert.deepEqual(result.artists, []);
  assert.equal(result.identityStatus, "unresolved");
});

test("titre avec featuring sans artiste explicite", () => {
  const result = parseTrackExpression(
    "Smoking Mirror feat. Pezzotti"
  );

  assert.equal(result.status, "partial");
  assert.equal(result.title, "Smoking Mirror");

  assert.deepEqual(
    result.artists.map(({ name, role }) => [name, role]),
    [["Pezzotti", "featuring"]]
  );
});

test("version sans artiste explicite", () => {
  const result = parseTrackExpression(
    "Freeze (Thomas Schumacher Remix)"
  );

  assert.equal(result.status, "partial");
  assert.equal(result.title, "Freeze");
  assert.equal(result.version.label, "Thomas Schumacher Remix");

  assert.deepEqual(
    result.artists.map(({ name, role }) => [name, role]),
    [["Thomas Schumacher", "remixer"]]
  );
});

test("supporte tiret long", () => {
  const result = parseTrackExpression("Metasplice – Teleric");

  assert.equal(result.status, "parsed");
  assert.equal(result.artistText, "Metasplice");
  assert.equal(result.title, "Teleric");
});

test("retourne plusieurs hypothèses lorsqu'il y a plusieurs frontières", () => {
  const result = parseTrackExpression(
    "queniv - Old Friend - De Lichting Één LP - [DL01] - 2018"
  );

  assert.equal(result.status, "parsed");
  assert.ok(result.candidates.length > 1);
});

test("parseTrackTitle ne transforme jamais un tiret du titre en frontière artiste", async () => {
  const { parseTrackTitle } =
    await import("./track-expression.mjs");

  const result = parseTrackTitle(
    "BOYÉ - Skefre, Ismayyyel"
  );

  assert.equal(
    result.title,
    "BOYÉ - Skefre, Ismayyyel"
  );

  assert.deepEqual(result.artists, []);
});

test("parseTrackTitle extrait néanmoins une version et son remixeur", async () => {
  const { parseTrackTitle } =
    await import("./track-expression.mjs");

  const result = parseTrackTitle(
    "Freeze (Thomas Schumacher Remix)"
  );

  assert.equal(result.title, "Freeze");
  assert.equal(
    result.version.label,
    "Thomas Schumacher Remix"
  );

  assert.deepEqual(
    result.artists.map(({ name, role }) => [
      name,
      role
    ]),
    [["Thomas Schumacher", "remixer"]]
  );
});
