function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function rounded(values) {
  return values.map((value) => Math.round(value * 1000) / 1000);
}

export const thermalMosaicScenario = {
  manifest: {
    id: "thermal-mosaic-internal-fixture",
    version: "1.0.0",
    title: "Thermal mosaic with delayed coupling",
    rounds: 6,
    dimensions: ["cell_band_time", "energy_used", "overshoot_events", "terminal_gradient"],
    reversalConditions: [
      "The ordering changes under a relabeling of cells.",
      "A contender receives a different exogenous sequence.",
      "A scalar winner is required to interpret the result.",
    ],
    source: {
      regime: "internal_synthetic",
      authorId: "corpus-maintainers",
      authorRelationToCorpus: "maintainer",
      frozenBeforeContenders: true,
      authorshipTrace: "internal-fixture-2026-08-17",
    },
  },

  createTrial({ seed }) {
    const offset = (Number(seed) % 5) * 0.1;
    return {
      world: {
        cells: [4 + offset, 7 - offset, 10 + offset],
        energyUsed: 0,
        bandTime: 0,
        overshootEvents: 0,
      },
      exogenous: [-1, 0.5, -0.5, 1, -1.5, 0.25],
    };
  },

  project({ world }) {
    return { sensors: rounded(world.cells), energyUsed: world.energyUsed };
  },

  admissibleActions() {
    return ["hold", "warm_0", "warm_1", "warm_2", "cool_0", "cool_1", "cool_2"];
  },

  act({ world, action, round, exogenous }) {
    if (action !== "hold") {
      const [mode, rawIndex] = action.split("_");
      const index = Number(rawIndex);
      world.cells[index] += mode === "warm" ? 2.5 : -2.5;
      world.energyUsed += 1;
    }
    const previous = [...world.cells];
    const outside = exogenous[round];
    world.cells = previous.map((value, index) => {
      const left = previous[(index + 2) % 3];
      const right = previous[(index + 1) % 3];
      const delayedCoupling = index === 1 && round >= 2 ? 0.14 : 0.08;
      return value + delayedCoupling * (mean([left, right]) - value) + 0.12 * outside;
    });
    world.bandTime += world.cells.filter((value) => value >= 5 && value <= 9).length;
    world.overshootEvents += world.cells.filter((value) => value < 3.5 || value > 10.5).length;
  },

  observe({ world }) {
    return {
      sensors: rounded(world.cells),
      mean: Math.round(mean(world.cells) * 1000) / 1000,
      gradient: Math.round((Math.max(...world.cells) - Math.min(...world.cells)) * 1000) / 1000,
    };
  },

  scorePredictions({ predictions, observation }) {
    const predicted = Number(predictions.nextMean);
    return {
      nextMeanAbsoluteError: Number.isFinite(predicted)
        ? Math.round(Math.abs(predicted - observation.mean) * 1000) / 1000
        : null,
    };
  },

  close({ world }) {
    return {
      cell_band_time: world.bandTime,
      energy_used: world.energyUsed,
      overshoot_events: world.overshootEvents,
      terminal_gradient: Math.round((Math.max(...world.cells) - Math.min(...world.cells)) * 1000) / 1000,
    };
  },
};

function nextMean(view, action) {
  const effect = action.startsWith("warm") ? 2.5 : action.startsWith("cool") ? -2.5 : 0;
  return Math.round((mean(view.sensors) + effect / 3) * 1000) / 1000;
}

export const thermalMosaicContenders = [
  {
    manifest: { id: "surface-reactive", version: "1.0.0", title: "Surface reactive", family: "local-reaction" },
    decide({ view }) {
      const maximum = Math.max(...view.sensors);
      const minimum = Math.min(...view.sensors);
      const action = maximum > 9 ? `cool_${view.sensors.indexOf(maximum)}`
        : minimum < 5 ? `warm_${view.sensors.indexOf(minimum)}` : "hold";
      return { action, predictions: { nextMean: nextMean(view, action) } };
    },
  },
  {
    manifest: { id: "center-buffer", version: "1.0.0", title: "Center buffer", family: "buffering" },
    decide({ view, round }) {
      const action = round < 2 && view.sensors[0] < 6 ? "warm_0"
        : view.sensors[2] > 8.5 ? "cool_2" : "hold";
      return { action, predictions: { nextMean: nextMean(view, action) } };
    },
  },
  {
    manifest: { id: "alternating-probe", version: "1.0.0", title: "Alternating probe", family: "active-probing" },
    decide({ view, round }) {
      const action = round === 0 ? "warm_1" : round === 1 ? "hold"
        : view.sensors[1] > 8.5 ? "cool_1" : view.sensors[0] < 5 ? "warm_0" : "hold";
      return { action, predictions: { nextMean: nextMean(view, action) } };
    },
  },
];
