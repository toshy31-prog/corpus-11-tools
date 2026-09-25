import test from "node:test";
import assert from "node:assert/strict";

import { mixDirectionGroups } from "./direction-mixer.mjs";

const candidate = (id, title, extra = {}) => ({
  id,
  title,
  ...extra
});

test("un poids nul désactive une route sans toucher aux autres", () => {
  const groups = {
    label: {
      items: [candidate("a", "A")]
    },
    curator: {
      items: [candidate("b", "B")]
    }
  };

  const result = mixDirectionGroups(groups, {
    patch: {
      directionWeights: {
        label: 0,
        curator: 1
      }
    }
  });

  assert.deepEqual(
    result.map(({ id }) => id),
    ["b"]
  );
});

test("tourner un potard change réellement le classement de routage", () => {
  const groups = {
    label: {
      items: [candidate("label-track", "Label track")]
    },
    curator: {
      items: [candidate("curator-track", "Curator track")]
    }
  };

  const result = mixDirectionGroups(groups, {
    patch: {
      directionWeights: {
        label: 0.2,
        curator: 0.9
      }
    }
  });

  assert.deepEqual(
    result.map(({ id }) => id),
    ["curator-track", "label-track"]
  );
});

test("un candidat trouvé par plusieurs routes garde toutes ses routes", () => {
  const shared = candidate("shared", "Shared", {
    status: "observed"
  });

  const result = mixDirectionGroups({
    label: {
      items: [
        {
          ...shared,
          path: ["label-path"]
        }
      ]
    },
    curator: {
      items: [
        {
          ...shared,
          path: ["curator-path"]
        }
      ]
    }
  }, {
    patch: {
      directionWeights: {
        label: 0.7,
        curator: 0.8
      }
    }
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].routing.routeCount, 2);
  assert.equal(result[0].routing.score, 1.5);

  assert.deepEqual(
    result[0].routing.routes.map(
      ({ direction }) => direction
    ),
    ["label", "curator"]
  );

  // Le mixer ne doit jamais transformer la preuve.
  assert.equal(result[0].status, "observed");
});

test("le score de routage n'est pas un score de vérité", () => {
  const result = mixDirectionGroups({
    label: {
      items: [
        candidate("x", "X", {
          status: "candidate",
          evidence: ["discogs"]
        })
      ]
    },
    curator: {
      items: [
        candidate("x", "X", {
          status: "candidate",
          evidence: ["youtube"]
        })
      ]
    }
  });

  assert.equal(result[0].routing.score, 2);
  assert.equal(result[0].status, "candidate");

  // Aucun champ de confiance/identité n'est créé.
  assert.equal("confidence" in result[0], false);
  assert.equal("identityScore" in result[0], false);
});

test("exclude et limit restent déterministes", () => {
  const result = mixDirectionGroups({
    label: {
      items: [
        candidate("a", "A"),
        candidate("b", "B")
      ]
    },
    curator: {
      items: [
        candidate("c", "C")
      ]
    }
  }, {
    exclude: ["a"],
    limit: 1
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].id, "c");
});
