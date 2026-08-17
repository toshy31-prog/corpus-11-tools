import { compileCapabilityBinding } from "./compiler.mjs";

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function predict(view, action) {
  const actionHeat = action.startsWith("warm") ? 2.5 : action.startsWith("cool") ? -2.5 : 0;
  return { nextMean: Math.round((mean(view.sensors) + actionHeat / 3) * 1000) / 1000 };
}

export const compiledHiddenCostThermal = compileCapabilityBinding({
  capabilityId: "CAP.HIDDEN_COST_ASSESSMENT",
  capabilityStatus: "candidate_unvalidated",
  domain: "thermal-mosaic-internal-fixture",
  title: "Hidden-cost assessment with energy-first thermal extension",
  observableMapping: {
    output: "sensor mean relative to target 7",
    energy: "cumulative intervention count",
    risk: "not visible until observation: overshoot events",
    compensation: "warming or cooling a cell",
    unsupported: ["attention", "carrier", "exposure history", "post-removal trace"],
  },
  decisionExtensionId: "minimize-action-energy-then-mean-error",
  predictionModel({ view, action }) {
    return predict(view, action);
  },
  assessment({ action, predictions }) {
    return {
      actionEnergy: action === "hold" ? 0 : 1,
      expectedMeanError: Math.abs(predictions.nextMean - 7),
    };
  },
  decisionExtension({ candidates }) {
    return candidates.sort((left, right) => (
      left.assessment.actionEnergy - right.assessment.actionEnergy
      || left.assessment.expectedMeanError - right.assessment.expectedMeanError
    ))[0].action;
  },
});

export const thermalHoldControl = {
  manifest: { id: "thermal-always-hold", version: "1.0.0", title: "Always hold", family: "negative-control" },
  decide({ view }) {
    return { action: "hold", predictions: predict(view, "hold") };
  },
};
