import { PLUGIN_CONTRACT_VERSION, registryIds, validateObserver, validatePlugin } from "./contracts.mjs";
import { clone, stableHash } from "./reproducibility.mjs";

function makeRandom(seed) {
  let state = Number(seed) >>> 0;
  return {
    next() {
      state = (1664525 * state + 1013904223) >>> 0;
      return state / 4294967296;
    },
    get state() { return state; },
  };
}

export class ExperimentEngine {
  constructor(plugin, configuration = {}) {
    validatePlugin(plugin);
    this.plugin = plugin;
    this.configuration = clone(configuration);
    this.observer = clone(configuration.observer ?? plugin.manifest.observer);
    validateObserver(this.observer, "configuration.observer");
    this.random = makeRandom(configuration.seed ?? 0);
    this.state = plugin.createState(clone(configuration));
    this.journal = [];
    this.sequence = 0;
  }

  invoke(kind, id, input = {}) {
    const registry = this.plugin[kind];
    const handler = registry?.[id];
    if (typeof handler !== "function") throw new Error(`Unknown ${kind} handler: ${id}`);
    const mutates = kind === "operations" || kind === "perturbations";
    const targetState = mutates ? this.state : clone(this.state);
    const beforeHash = stableHash(this.state);
    const result = handler({
      state: targetState,
      input: clone(input),
      configuration: clone(this.configuration),
      observer: clone(this.observer),
      random: mutates ? this.random : makeRandom(this.random.state),
    });
    const afterHash = stableHash(this.state);
    this.sequence += 1;
    this.journal.push({
      sequence: this.sequence,
      kind,
      id,
      input: clone(input),
      result: clone(result),
      beforeHash,
      afterHash,
      mutated: beforeHash !== afterHash,
    });
    return clone(result);
  }

  operate(id, input) { return this.invoke("operations", id, input); }
  perturb(id, input) { return this.invoke("perturbations", id, input); }
  observe(id, input) { return this.invoke("observers", id, input); }
  evaluate(id, input) { return this.invoke("criteria", id, input); }

  run(steps) {
    return steps.map((step) => {
      const methods = { operation: "operate", perturbation: "perturb", observation: "observe", criterion: "evaluate" };
      const method = methods[step.kind];
      if (!method) throw new Error(`Unknown step kind: ${step.kind}`);
      return this[method](step.id, step.input ?? {});
    });
  }

  snapshot() {
    return {
      contract: PLUGIN_CONTRACT_VERSION,
      plugin: {
        id: this.plugin.manifest.id,
        version: this.plugin.manifest.version,
        title: this.plugin.manifest.title,
        observer: clone(this.observer),
        registries: registryIds(this.plugin),
      },
      configuration: clone(this.configuration),
      randomState: this.random.state,
      state: clone(this.state),
      stateHash: stableHash(this.state),
      journal: clone(this.journal),
    };
  }
}

export function createEngine(plugin, configuration = {}) {
  return new ExperimentEngine(plugin, configuration);
}
