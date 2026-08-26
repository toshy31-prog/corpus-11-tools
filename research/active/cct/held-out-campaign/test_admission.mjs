import assert from "node:assert/strict";
import test from "node:test";
import { computeScenarioHash } from "../../../../corpus-11-tools/labs/experiment-lab/arena/declarative/hash.mjs";
import { admitDocument, KNOWN_V1_WORLDS, REQUIRED_AXES } from "./admission.mjs";

function validDocument() {
  const dimensions = Object.fromEntries(REQUIRED_AXES.map((axis) => [axis, `held_${axis}`]));
  const document = {
    schema: "corpus-open-world/v1",
    manifest: {
      id: "independent-held-out-witness",
      version: "1.0.0",
      title: "Independent held-out witness",
      rounds: 4,
      dimensions: Object.values(dimensions),
      reversalConditions: ["A threshold fails under a declared observation.", "No contender makes a discriminating prediction."],
    },
    source: {
      regime: "external_supplied",
      authorId: "independent-test-author",
      authorRelationToCorpus: "independent",
      frozenBeforeContenders: true,
      authorshipTrace: "test-author-controlled-trace-001",
    },
    campaignEnvelope: {
      protocolVersion: "cct-held-out-campaign/v1",
      independenceDeclaration: {
        declaresNoAccessToCandidateV013: true,
        contenderIdentitiesWithheldUntilFreeze: true,
        notDerivedFromKnownV1Worlds: true,
        knownV1Worlds: KNOWN_V1_WORLDS,
      },
      matching: {
        sameInitialWorld: true,
        sameExogenousSequence: true,
        sameInformationBudget: true,
        sameActionBudget: true,
        actionUnitsPerRound: 1,
      },
      dimensionMap: dimensions,
      dimensionOrientation: Object.fromEntries(REQUIRED_AXES.map((axis) => [axis, "min"])),
      nonCompensableThresholds: Object.fromEntries(REQUIRED_AXES.map((axis) => [axis, { operator: "gt", value: 100 }])),
      preExecutionPrediction: {
        nonCctRivalMayBeFavored: true,
        reason: "A low-overhead rival may preserve the scarce action budget.",
      },
      thresholdsAuthoredBeforeContenders: true,
      scalarWinnerForbidden: true,
    },
    initialState: { pressure: 0 },
    exogenous: [{ pulse: 1 }, { pulse: 1 }, { pulse: -1 }, { pulse: 2 }],
    view: { pressure: { path: "state.pressure" } },
    actions: { hold: [], offset: [{ op: "add", path: "state.pressure", value: -1 }] },
    transition: [{ op: "add", path: "state.pressure", value: { path: "event.pulse" } }],
    observation: { pressure: { path: "state.pressure" } },
    predictionTargets: { nextPressure: "pressure" },
    outcomes: Object.fromEntries(Object.values(dimensions).map((name) => [name, { path: "state.pressure" }])),
  };
  document.freeze = { algorithm: "sha256", contentHash: computeScenarioHash(document) };
  return document;
}

test("a frozen independent declaration with six mapped axes is admitted", () => {
  const result = admitDocument(validDocument());
  assert.equal(result.admitted, true);
  assert.equal(Object.keys(result.mappedAxes).length, 6);
});

test("candidate exposure declaration is mandatory", () => {
  const document = validDocument();
  document.campaignEnvelope.independenceDeclaration.declaresNoAccessToCandidateV013 = false;
  document.freeze.contentHash = computeScenarioHash(document);
  assert.throws(() => admitDocument(document), /candidate separation/);
});

test("known v1 world identities are rejected", () => {
  const document = validDocument();
  document.manifest.id = "emergency-capture-remix";
  document.freeze.contentHash = computeScenarioHash(document);
  assert.throws(() => admitDocument(document), /known v1 world identity/);
});

test("unmatched action budgets are rejected", () => {
  const document = validDocument();
  document.campaignEnvelope.matching.sameActionBudget = false;
  document.freeze.contentHash = computeScenarioHash(document);
  assert.throws(() => admitDocument(document), /sameActionBudget/);
});

test("two axes cannot collapse into the same outcome", () => {
  const document = validDocument();
  document.campaignEnvelope.dimensionMap.recuperation = document.campaignEnvelope.dimensionMap.droits;
  document.freeze.contentHash = computeScenarioHash(document);
  assert.throws(() => admitDocument(document), /distinct dimensions/);
});

test("post-freeze mutation is rejected by the declarative adapter", () => {
  const document = validDocument();
  document.initialState.pressure = 99;
  assert.throws(() => admitDocument(document), /freeze mismatch/);
});

test("unsupported direct subtraction mutation is rejected by dry execution", () => {
  const document = validDocument();
  document.actions.offset[0].op = "sub";
  document.freeze.contentHash = computeScenarioHash(document);
  assert.throws(() => admitDocument(document), /mutation requires op set\|add/);
});

test("missing outcome orientation is rejected", () => {
  const document = validDocument();
  delete document.campaignEnvelope.dimensionOrientation.plafond_ecologique;
  document.freeze.contentHash = computeScenarioHash(document);
  assert.throws(() => admitDocument(document), /explicit min\|max orientation/);
});

test("missing structured threshold is rejected", () => {
  const document = validDocument();
  delete document.campaignEnvelope.nonCompensableThresholds.droits;
  document.freeze.contentHash = computeScenarioHash(document);
  assert.throws(() => admitDocument(document), /finite non-compensable threshold/);
});

test("threshold breach direction must match outcome orientation", () => {
  const document = validDocument();
  document.campaignEnvelope.nonCompensableThresholds.besoins_vitaux.operator = "lt";
  document.freeze.contentHash = computeScenarioHash(document);
  assert.throws(() => admitDocument(document), /breach direction must match/);
});

test("orientations and thresholds keyed by outcome names are normalized", () => {
  const document = validDocument();
  const mapped = document.campaignEnvelope.dimensionMap;
  document.campaignEnvelope.dimensionOrientation = Object.fromEntries(
    REQUIRED_AXES.map((axis) => [mapped[axis], "min"]),
  );
  document.campaignEnvelope.nonCompensableThresholds = Object.fromEntries(
    REQUIRED_AXES.map((axis) => [mapped[axis], { operator: "gt", value: 100 }]),
  );
  document.freeze.contentHash = computeScenarioHash(document);
  const result = admitDocument(document);
  assert.equal(result.orientations.besoins_vitaux, "min");
  assert.equal(result.nonCompensableThresholds.recuperation.value, 100);
});
