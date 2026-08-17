function prediction(view, action, round) {
  const pulses = [4, -1, 3];
  return view.stock + pulses[round] + (action === "release_two" ? -2 : 0);
}

export const declarativePulseContenders = [
  {
    manifest: { id: "pulse-holder", version: "1.0.0", title: "Pulse holder", family: "non-intervention" },
    decide({ view, round }) {
      const action = "hold";
      return { action, predictions: { nextStock: prediction(view, action, round) } };
    },
  },
  {
    manifest: { id: "pulse-release-above-five", version: "1.0.0", title: "Release above five", family: "threshold" },
    decide({ view, round }) {
      const action = view.stock > 5 ? "release_two" : "hold";
      return { action, predictions: { nextStock: prediction(view, action, round) } };
    },
  },
];
