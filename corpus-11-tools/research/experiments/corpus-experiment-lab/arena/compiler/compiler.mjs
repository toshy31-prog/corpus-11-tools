const REQUIRED_BINDING_FIELDS = [
  "capabilityId",
  "capabilityStatus",
  "domain",
  "observableMapping",
  "predictionModel",
  "assessment",
  "decisionExtension",
];

export function compileCapabilityBinding(binding) {
  const missing = REQUIRED_BINDING_FIELDS.filter((field) => binding?.[field] == null);
  if (missing.length) throw new Error(`capability binding missing: ${missing.join(", ")}`);
  if (binding.capabilityStatus !== "candidate_unvalidated") {
    throw new Error("compiler currently accepts only explicitly unvalidated capability candidates");
  }
  if (typeof binding.predictionModel !== "function" || typeof binding.assessment !== "function"
      || typeof binding.decisionExtension !== "function") {
    throw new Error("predictionModel, assessment, and decisionExtension must be functions");
  }
  if (!binding.decisionExtensionId) {
    throw new Error("decisionExtensionId is required: a capability assessment is not an action policy");
  }

  return {
    manifest: {
      id: `compiled:${binding.capabilityId}:${binding.domain}:${binding.decisionExtensionId}`,
      version: "1.0.0",
      title: binding.title ?? `${binding.capabilityId} bound to ${binding.domain}`,
      family: "compiled-capability-binding",
      compilation: {
        capabilityId: binding.capabilityId,
        capabilityStatus: binding.capabilityStatus,
        domain: binding.domain,
        observableMapping: structuredClone(binding.observableMapping),
        decisionExtensionId: binding.decisionExtensionId,
        conclusionBoundary: "actions_depend_on_declared_decision_extension_not_capability_alone",
      },
    },

    decide(context) {
      const candidates = context.allowedActions.map((action) => {
        const predictions = binding.predictionModel({ ...context, action });
        const assessment = binding.assessment({ ...context, action, predictions });
        return { action, predictions, assessment };
      });
      const selected = binding.decisionExtension({ ...context, candidates: structuredClone(candidates) });
      const candidate = candidates.find((item) => item.action === selected);
      if (!candidate) throw new Error("decision extension selected an action outside the assessed candidates");
      return { action: candidate.action, predictions: candidate.predictions };
    },
  };
}
