import { clone } from "../../core/reproducibility.mjs";
import { applyMutations, projectExpressions } from "./expression.mjs";
import { verifyScenarioFreeze } from "./hash.mjs";

export function createDeclarativeScenario(document) {
  const freezeHash = verifyScenarioFreeze(document);
  if (document?.schema !== "corpus-open-world/v1") throw new Error("unsupported declarative scenario schema");
  if (!document.initialState || typeof document.initialState !== "object") throw new Error("initialState is required");
  if (!Array.isArray(document.exogenous) || document.exogenous.length !== document.manifest?.rounds) {
    throw new Error("exogenous sequence length must equal manifest.rounds");
  }
  if (!document.actions || typeof document.actions !== "object" || Object.keys(document.actions).length < 2) {
    throw new Error("at least two declarative actions are required");
  }
  const source = { ...clone(document.source), freezeHash, freezeVerified: true };

  return {
    manifest: {
      ...clone(document.manifest),
      source,
    },

    createTrial() {
      return { world: clone(document.initialState), exogenous: clone(document.exogenous) };
    },

    project({ world, round }) {
      return projectExpressions(document.view, {
        state: clone(world), round, event: clone(document.exogenous[round]),
      });
    },

    admissibleActions() {
      return Object.keys(document.actions);
    },

    act({ world, action, round, exogenous }) {
      const context = { state: world, round, event: clone(exogenous[round]) };
      applyMutations(document.actions[action], context);
      applyMutations(document.transition ?? [], context);
    },

    observe({ world, round }) {
      return projectExpressions(document.observation, {
        state: clone(world), round, event: clone(document.exogenous[round]),
      });
    },

    scorePredictions({ predictions, observation }) {
      return Object.fromEntries(Object.entries(document.predictionTargets ?? {}).map(([predictionKey, observationKey]) => {
        const predicted = Number(predictions[predictionKey]);
        const observed = Number(observation[observationKey]);
        return [`${predictionKey}AbsoluteError`, Number.isFinite(predicted) && Number.isFinite(observed)
          ? Math.abs(predicted - observed) : null];
      }));
    },

    close({ world }) {
      return projectExpressions(document.outcomes, {
        state: clone(world), round: document.manifest.rounds, event: {},
      });
    },
  };
}
