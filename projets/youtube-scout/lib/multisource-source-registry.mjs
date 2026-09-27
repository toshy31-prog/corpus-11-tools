function clean(value = "") {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/gu, " ")
    .trim();
}

const CAPABILITIES = new Set(["identity", "credits", "catalogue", "discovery", "playback"]);

// This validates a recorded review, not the truth or legal force of its evidence.
function admissionContract(value, now) {
  const denied = reason => Object.freeze({ status: "denied", reason });
  if (!value || typeof value !== "object" || value.version !== 1) return denied("unknown_contract");
  if (!["private", "global"].includes(value.scope)) return denied("unknown_scope");
  if (!["candidateOnly", "merge"].includes(value.mode)) return denied("unknown_mode");
  if (!Array.isArray(value.capabilities) || !value.capabilities.length || value.capabilities.some(c => !CAPABILITIES.has(c))) return denied("unknown_capability");
  const policies = {};
  for (const name of ["access", "storage"]) {
    const policy = value[name];
    const date = typeof policy?.verifiedAt === "string" ? Date.parse(policy.verifiedAt) : NaN;
    if (policy?.status !== "reviewed" || !Number.isFinite(date) || date > now || typeof policy.evidence !== "string" || !policy.evidence.trim()) return denied(`unreviewed_${name}`);
    if (name === "storage" && !["none", "ephemeral", "persistent"].includes(policy.retention)) return denied("unknown_retention");
    policies[name] = Object.freeze({ status: "reviewed", verifiedAt: policy.verifiedAt, evidence: policy.evidence.trim(), ...(name === "storage" ? { retention: policy.retention } : {}) });
  }
  return Object.freeze({ version: 1, status: "admitted", scope: value.scope, mode: value.mode, capabilities: Object.freeze([...new Set(value.capabilities)]), ...policies });
}

export function createSourceRegistry({ now = () => Date.now() } = {}) {
  const sources = new Map();

  return {
    register(source) {
      if (!source || typeof source !== "object") {
        throw new TypeError("source must be an object");
      }

      const id = clean(source.id);

      if (!id) {
        throw new TypeError("source.id is required");
      }

      if (sources.has(id)) {
        throw new Error(`source already registered: ${id}`);
      }

      if (typeof source.resolve !== "function") {
        throw new TypeError(
          `source.resolve must be a function for ${id}`
        );
      }

      const admission = Object.hasOwn(source, "admission")
        ? admissionContract(source.admission, now())
        : Object.freeze({ status: "legacy", reason: "not_reviewed_by_this_contract" });
      const registered = {
        id,
        priority:
          Number.isFinite(source.priority)
            ? source.priority
            : 100,
        enabled:
          source.enabled !== false && admission.status !== "denied",
        admission,
        kind:
          clean(source.kind || "external"),
        resolve:
          source.resolve
      };
      // Preserve legacy mutability, but do not let opt-in contracts be replaced
      // through get()/list() and thereby bypass their admission filters.
      sources.set(id, admission.status === "legacy" ? registered : Object.freeze(registered));

      return this;
    },

    get(id) {
      return sources.get(clean(id)) || null;
    },

    list({ purpose = "merge", scope = "global", capability } = {}) {
      if (!["merge", "candidates"].includes(purpose) || !["private", "global"].includes(scope)) return [];
      return [...sources.values()]
        .filter(({ enabled }) => enabled)
        .filter(({ admission: a }) => a.status === "legacy" || (
          a.status === "admitted" && a.scope === scope &&
          (purpose === "candidates" || a.mode === "merge") &&
          (!capability || a.capabilities.includes(capability))
        ))
        .sort(
          (a, b) =>
            a.priority - b.priority ||
            a.id.localeCompare(b.id)
        );
    }
  };
}
