function forecast(view, action) {
  const actionPitch = { file_lip: -4, wet_wrap: -2, leave_alone: 0 }[action];
  const actionCraze = action === "file_lip" ? 1 : action === "wet_wrap" ? Math.abs(view.air) + 1 : 0;
  return {
    nextPitch: view.pitch + actionPitch + view.air,
    nextCraze: view.craze + actionCraze + Math.abs(view.air),
  };
}

export const ilyanaBellContenders = [
  {
    manifest: { id: "nearest-note", version: "1.0.0", title: "Nearest note", family: "target-chasing" },
    decide({ view }) {
      const candidates = ["file_lip", "wet_wrap", "leave_alone"];
      const action = candidates.map((name) => [name, Math.abs(forecast(view, name).nextPitch - 100)])
        .sort((left, right) => left[1] - right[1])[0][0];
      return { action, predictions: forecast(view, action) };
    },
  },
  {
    manifest: { id: "never-wet", version: "1.0.0", title: "Never wet", family: "material-rule" },
    decide({ view }) {
      const action = view.pitch > 103 && view.craze < 9 ? "file_lip" : "leave_alone";
      return { action, predictions: forecast(view, action) };
    },
  },
  {
    manifest: { id: "one-touch", version: "1.0.0", title: "One touch only", family: "workshop-ritual" },
    decide({ view, round }) {
      const action = round === 0 ? "wet_wrap" : "leave_alone";
      return { action, predictions: forecast(view, action) };
    },
  },
];
