/**
 * Internal synthetic stress worlds for CCT.
 *
 * This is deliberately a small executable interpretation of a few constitutional
 * commitments, not a model of a territory.  Every contender receives the same
 * partially observed state and the same frozen attack sequence.
 */

const ATTACKS = [
  { id: "dependency-monopoly", needs: .65, ecology: .35, cross: .70, security: .20, capture: .45, information: .30 },
  { id: "emergency-capture", needs: .48, ecology: .28, cross: .35, security: .88, capture: .72, information: .42 },
  { id: "fragmentation-cascade", needs: .62, ecology: .22, cross: .91, security: .32, capture: .42, information: .44 },
  { id: "ecological-evasion", needs: .40, ecology: .90, cross: .62, security: .20, capture: .52, information: .38 },
  { id: "local-domination", needs: .33, ecology: .30, cross: .28, security: .48, capture: .95, information: .36 },
  { id: "information-siege", needs: .52, ecology: .44, cross: .48, security: .56, capture: .58, information: .92 },
];

const clamp = (value) => Math.max(0, Math.min(1, value));

function attackFor(seed) {
  return ATTACKS[Math.abs(Number(seed)) % ATTACKS.length];
}

function applyAction(world, action) {
  switch (action) {
    case "mutualize":
      world.needs -= .18 * (1 - .45 * world.information);
      world.recovery -= .13;
      world.power += .045 * world.crossSignal;
      break;
    case "protect_rights":
      world.rights -= .20;
      world.exit -= .11;
      world.needs += .045 * world.securitySignal;
      break;
    case "ecological_brake":
      world.ecology -= .22;
      world.needs += .075 * world.needs;
      break;
    case "delegate":
      world.needs -= .23;
      world.recovery -= .10;
      world.rights += .10;
      world.power += .19;
      world.exit += .08;
      break;
    case "audit":
      world.power -= .20 * (1 - .60 * world.information);
      world.rights -= .075;
      world.needs += .055;
      break;
    case "localize":
      world.power -= .13;
      world.exit -= .08;
      world.needs += .19 * world.crossSignal;
      world.recovery += .08 * world.crossSignal;
      break;
    case "continuity":
      world.needs -= .20;
      world.recovery -= .10;
      world.ecology += .09;
      break;
    default:
      break;
  }
}

function applyAttack(world, attack, round) {
  const escalation = 1 + round * .09;
  world.needs += escalation * (.105 * attack.needs + .050 * attack.cross);
  world.ecology += escalation * (.115 * attack.ecology + .022 * attack.needs);
  world.rights += escalation * (.095 * attack.security + .082 * attack.capture);
  world.power += escalation * (.11 * attack.capture + .045 * attack.security);
  world.exit += escalation * (.09 * attack.capture + .055 * attack.cross);
  world.recovery += escalation * (.075 * attack.information + .045 * attack.cross);
  world.information = clamp(world.information + .055 * attack.information);
  for (const key of ["needs", "ecology", "rights", "power", "exit", "recovery"]) world[key] = clamp(world[key]);
}

function observation(world) {
  return {
    needs: Math.round(world.needs * 1000) / 1000,
    ecology: Math.round(world.ecology * 1000) / 1000,
    rights: Math.round(world.rights * 1000) / 1000,
    power: Math.round(world.power * 1000) / 1000,
    exit: Math.round(world.exit * 1000) / 1000,
    recovery: Math.round(world.recovery * 1000) / 1000,
    // The exact attack name and future escalation are never exposed to a contender.
    visibleSignals: {
      crossBorderDependency: world.crossSignal > .55,
      securityPressure: world.securitySignal > .55,
      informationReliability: Math.round((1 - world.information) * 100) / 100,
    },
  };
}

export const cctStressScenario = {
  manifest: {
    id: "cct-adversarial-constitutional-stress-v1",
    version: "0.1.0",
    title: "CCT constitutional stress worlds",
    rounds: 5,
    dimensions: ["vital_unmet", "ecological_breach", "rights_burden", "unaccountable_power", "exit_obstruction", "recovery_lag"],
    reversalConditions: [
      "The CCT interpretation crosses any non-compensable constitutional threshold in four of six frozen worlds.",
      "A matched rival is no worse on every outcome dimension in a frozen world.",
      "Removing one CCT safeguard improves no protected dimension while reducing administrative action count.",
    ],
    source: {
      regime: "internal_synthetic",
      authorId: "cct-maintainers",
      authorRelationToCorpus: "maintainer",
      frozenBeforeContenders: true,
      authorshipTrace: "cct-adversarial-arena-v1-internal-2026-08-26",
    },
  },

  createTrial({ seed }) {
    const attack = attackFor(seed);
    return {
      world: {
        needs: .13 * attack.needs,
        ecology: .10 * attack.ecology,
        rights: .06 * attack.security,
        power: .08 * attack.capture,
        exit: .05 * attack.capture,
        recovery: .10 * attack.information,
        information: .10 * attack.information,
        crossSignal: attack.cross,
        securitySignal: attack.security,
      },
      exogenous: { attack },
    };
  },

  project({ world, history }) {
    // A round is deliberately not exposed: contenders cannot key a fixed script to
    // a known shock schedule.  Past observations/actions remain available.
    return observation(world);
  },

  admissibleActions() {
    return ["mutualize", "protect_rights", "ecological_brake", "delegate", "audit", "localize", "continuity"];
  },

  act({ world, action, round, exogenous }) {
    applyAction(world, action);
    applyAttack(world, exogenous.attack, round);
  },

  observe({ world, round }) {
    return { round, ...observation(world) };
  },

  scorePredictions({ predictions, observation }) {
    const predicted = Number(predictions.nextNeeds);
    return {
      next_needs_absolute_error: Number.isFinite(predicted)
        ? Math.round(Math.abs(predicted - observation.needs) * 1000) / 1000
        : null,
    };
  },

  close({ world }) {
    return {
      vital_unmet: Math.round(world.needs * 1000) / 10,
      ecological_breach: Math.round(world.ecology * 1000) / 10,
      rights_burden: Math.round(world.rights * 1000) / 10,
      unaccountable_power: Math.round(world.power * 1000) / 10,
      exit_obstruction: Math.round(world.exit * 1000) / 10,
      recovery_lag: Math.round(world.recovery * 1000) / 10,
    };
  },
};

function prediction(view, action) {
  const actionEffect = { mutualize: -.15, delegate: -.21, continuity: -.18, localize: .08, audit: .04, protect_rights: .02, ecological_brake: .03 }[action];
  return { nextNeeds: Math.max(0, Math.min(1, view.needs + actionEffect)) };
}

export const cctStressContenders = [
  {
    manifest: { id: "cct-v012-constitutional", version: "0.12", title: "CCT v0.12 constitutional kernel", family: "polycentric-constitutional" },
    decide({ view }) {
      const action = view.power > .42 || view.rights > .42 ? "audit"
        : view.visibleSignals.securityPressure ? "protect_rights"
        : view.ecology > .42 ? "ecological_brake"
        : view.visibleSignals.crossBorderDependency ? "mutualize"
        : "continuity";
      return { action, predictions: prediction(view, action) };
    },
  },
  {
    manifest: { id: "central-emergency", version: "0.1", title: "Central emergency command", family: "centralized-command" },
    decide({ view }) {
      const action = view.needs > .28 || view.recovery > .32 ? "delegate"
        : view.ecology > .48 ? "ecological_brake" : "continuity";
      return { action, predictions: prediction(view, action) };
    },
  },
  {
    manifest: { id: "local-sovereignty", version: "0.1", title: "Local sovereignty", family: "local-autonomy" },
    decide({ view }) {
      const action = view.power > .36 || view.rights > .36 ? "localize"
        : view.ecology > .34 ? "ecological_brake" : "protect_rights";
      return { action, predictions: prediction(view, action) };
    },
  },
  {
    manifest: { id: "federal-resilience", version: "0.1", title: "Minimal federal resilience", family: "federal-resilience" },
    decide({ view }) {
      const action = view.power > .36 ? "audit"
        : view.ecology > .36 ? "ecological_brake"
        : view.visibleSignals.crossBorderDependency ? "mutualize" : "continuity";
      return { action, predictions: prediction(view, action) };
    },
  },
];

export const attackNames = ATTACKS.map((attack) => attack.id);
