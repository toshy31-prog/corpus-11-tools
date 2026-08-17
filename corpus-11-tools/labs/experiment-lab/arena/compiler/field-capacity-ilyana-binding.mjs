import { compileCapabilityBinding } from "./compiler.mjs";

const COUNTERFACTUAL_AIR = [-3, -2, -1, 0, 1, 2, 3];

function actionEffects(action, air) {
  return {
    pitch: { file_lip: -4, wet_wrap: -2, leave_alone: 0 }[action] + air,
    craze: (action === "file_lip" ? 1 : action === "wet_wrap" ? Math.abs(air) + 1 : 0) + Math.abs(air),
  };
}

export const compiledFieldCapacityIlyana = compileCapabilityBinding({
  capabilityId: "CAP.FIELD_CAPACITY_ASSESSMENT",
  capabilityStatus: "candidate_unvalidated",
  domain: "ilyana-sorel-wet-bell",
  title: "Field-capacity assessment with minimax pitch extension",
  observableMapping: {
    environment: "daily air perturbation",
    device: "ceramic bell",
    history: "prior actions and accumulated state",
    load: "craze already accumulated",
    output: "pitch after action and air perturbation",
    unsupported: ["provider", "financier", "maintainer", "counterparty", "energy channel"],
  },
  decisionExtensionId: "minimize-worst-counterfactual-pitch-error-then-craze",
  predictionModel({ view, action }) {
    const effect = actionEffects(action, view.air);
    return { nextPitch: view.pitch + effect.pitch, nextCraze: view.craze + effect.craze };
  },
  assessment({ view, action, predictions }) {
    const counterfactualErrors = COUNTERFACTUAL_AIR.map((air) => (
      Math.abs(view.pitch + actionEffects(action, air).pitch - 100)
    ));
    return {
      worstCounterfactualPitchError: Math.max(...counterfactualErrors),
      expectedCrazeIncrement: predictions.nextCraze - view.craze,
    };
  },
  decisionExtension({ candidates }) {
    return candidates.sort((left, right) => (
      left.assessment.worstCounterfactualPitchError - right.assessment.worstCounterfactualPitchError
      || left.assessment.expectedCrazeIncrement - right.assessment.expectedCrazeIncrement
    ))[0].action;
  },
});
