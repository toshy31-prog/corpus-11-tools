import { compileCapabilityBinding } from "./compiler.mjs";

function forecast(view, action) {
  const pitchChange = { file_lip: -4, wet_wrap: -2, leave_alone: 0 }[action];
  const actionCraze = action === "file_lip" ? 1 : action === "wet_wrap" ? Math.abs(view.air) + 1 : 0;
  return {
    nextPitch: view.pitch + pitchChange + view.air,
    nextCraze: view.craze + actionCraze + Math.abs(view.air),
  };
}

export const compiledHiddenCostIlyana = compileCapabilityBinding({
  capabilityId: "CAP.HIDDEN_COST_ASSESSMENT",
  capabilityStatus: "candidate_unvalidated",
  domain: "ilyana-sorel-wet-bell",
  title: "Hidden-cost assessment with conservative workshop extension",
  observableMapping: {
    output: "distance of pitch from 100",
    risk: "increment in visible craze",
    compensation: "clay removed or wet wrapping",
    trace: "cumulative craze and clay removed",
    unsupported: ["time", "energy", "attention", "carrier", "post-removal trace"],
  },
  decisionExtensionId: "minimize-next-craze-then-pitch-error",
  predictionModel({ view, action }) {
    return forecast(view, action);
  },
  assessment({ view, predictions }) {
    return {
      expectedCrazeIncrement: predictions.nextCraze - view.craze,
      expectedPitchError: Math.abs(predictions.nextPitch - 100),
    };
  },
  decisionExtension({ candidates }) {
    return candidates.sort((left, right) => (
      left.assessment.expectedCrazeIncrement - right.assessment.expectedCrazeIncrement
      || left.assessment.expectedPitchError - right.assessment.expectedPitchError
    ))[0].action;
  },
});
