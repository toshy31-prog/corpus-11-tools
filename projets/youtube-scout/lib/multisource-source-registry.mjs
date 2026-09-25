function clean(value = "") {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/gu, " ")
    .trim();
}

export function createSourceRegistry() {
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

      sources.set(id, {
        id,
        priority:
          Number.isFinite(source.priority)
            ? source.priority
            : 100,
        enabled:
          source.enabled !== false,
        kind:
          clean(source.kind || "external"),
        resolve:
          source.resolve
      });

      return this;
    },

    get(id) {
      return sources.get(clean(id)) || null;
    },

    list() {
      return [...sources.values()]
        .filter(({ enabled }) => enabled)
        .sort(
          (a, b) =>
            a.priority - b.priority ||
            a.id.localeCompare(b.id)
        );
    }
  };
}
