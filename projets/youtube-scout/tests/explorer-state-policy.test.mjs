import test from "node:test";
import assert from "node:assert/strict";

import {
  emptyActiveDig,
  chooseMostRecentRecovery,
  isValidRecovery,
  recoveryFromBackup,
  bootExplorerState,
  resumeExplorerState
} from "../patch/explorer-state-policy.mjs";

const recovery = {
  schemaVersion: 2,
  id: "r1",
  seed: {
    id: "video:youtube:kosh",
    label: "Kosh"
  },
  front: {
    seed: {
      id: "video:youtube:kosh"
    },
    branches: [],
    updatedAt: "2026-09-13T10:00:00.000Z"
  },
  updatedAt: "2026-09-13T10:00:00.000Z"
};

test("boot reste neutre même si une recovery valide existe", () => {
  const state = bootExplorerState({
    recovery,
    now: "2026-09-14T12:00:00.000Z"
  });

  assert.equal(state.activeDig.seed, null);
  assert.equal(state.explorationSession, null);
  assert.equal(state.resumableDig.id, "r1");
});

test("recovery backup ne reçoit pas un nouveau timestamp", () => {
  const restored = recoveryFromBackup(recovery);
  assert.equal(restored.updatedAt, recovery.updatedAt);
});

test("reprise explicite active le front", () => {
  const state = resumeExplorerState(recovery);
  assert.equal(state.activeDig.id, "r1");
  assert.equal(state.explorationSession, recovery.front);
});

test("la recovery la plus récente est choisie sans être activée", () => {
  const newer = {
    ...recovery,
    id: "r2",
    updatedAt: "2026-09-14T09:00:00.000Z"
  };

  assert.equal(
    chooseMostRecentRecovery([recovery, newer]).id,
    "r2"
  );
});

test("recovery invalide refusée", () => {
  assert.equal(isValidRecovery({ schemaVersion: 2 }), false);
  assert.throws(() => resumeExplorerState({ schemaVersion: 2 }));
});

test("active vide a une forme stable", () => {
  const state = emptyActiveDig("2026-09-14T12:00:00.000Z");
  assert.equal(state.seed, null);
  assert.equal(state.front, null);
  assert.deepEqual(state.derived, []);
  assert.deepEqual(state.navigationStack, []);
});
