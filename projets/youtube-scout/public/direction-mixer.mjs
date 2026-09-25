import {
  SCOUT_DIRECTIONS,
  createScoutPatch
} from "./scout-parameters.mjs";

function candidateKey(item = {}) {
  return String(
    item.id ||
    item.videoId ||
    item.sourceId ||
    item.url ||
    ""
  ).trim();
}

function candidateLabel(item = {}) {
  return String(
    item.title ||
    item.label ||
    item.name ||
    candidateKey(item)
  );
}

function routingSignal(direction, weight, position, item) {
  return {
    direction,
    weight,
    position,
    path: Array.isArray(item?.path) ? item.path : []
  };
}

/**
 * Merge les sorties déjà calculées par les moteurs de directions.
 *
 * Important:
 * - ne crée aucune identité;
 * - ne modifie aucun statut de preuve;
 * - ne contacte aucune API;
 * - ne remplace pas selectDiscoveries();
 * - fournit seulement une couche de routage pondérée.
 */
export function mixDirectionGroups(
  groups = {},
  {
    patch = {},
    exclude = [],
    limit = Infinity,
    supplementaryDirections = []
  } = {}
) {
  const controls = createScoutPatch(patch);
  const excluded = new Set(
    (exclude || []).map((value) => String(value))
  );

  const merged = new Map();

  for (const { id: direction } of [...SCOUT_DIRECTIONS, ...supplementaryDirections]) {
    const weight =
      controls.directionWeights[direction] ?? 1;

    if (weight <= 0) continue;

    const group = groups?.[direction];
    const items = Array.isArray(group?.items)
      ? group.items
      : [];

    items.forEach((item, position) => {
      const key = candidateKey(item);

      if (!key || excluded.has(key)) return;

      const signal = routingSignal(
        direction,
        weight,
        position,
        item
      );

      const previous = merged.get(key);

      if (!previous) {
        merged.set(key, {
          ...item,

          // "routing" est volontairement séparé de toute donnée
          // d'identité/evidence.
          routing: {
            score: weight,
            routeCount: 1,
            bestPosition: position,
            routes: [signal]
          }
        });

        return;
      }

      // Une direction ne doit contribuer qu'une fois par candidat.
      if (
        previous.routing.routes.some(
          (route) => route.direction === direction
        )
      ) {
        return;
      }

      previous.routing = {
        score: previous.routing.score + weight,
        routeCount: previous.routing.routeCount + 1,
        bestPosition: Math.min(
          previous.routing.bestPosition,
          position
        ),
        routes: [
          ...previous.routing.routes,
          signal
        ]
      };
    });
  }

  const mixed = [...merged.values()];

  mixed.sort((left, right) =>
    right.routing.score - left.routing.score ||
    right.routing.routeCount - left.routing.routeCount ||
    left.routing.bestPosition - right.routing.bestPosition ||
    candidateLabel(left).localeCompare(
      candidateLabel(right),
      "fr-FR"
    )
  );

  const safeLimit = Number.isFinite(Number(limit))
    ? Math.max(0, Number(limit))
    : mixed.length;

  return mixed.slice(0, safeLimit);
}
