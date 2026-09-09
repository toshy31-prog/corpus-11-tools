import { OBSERVER_KEYS, observerStatement } from "../sequenced-restoration-v6.4-cross-observer-checkpoint-agreement/fixtures.mjs";
import { audit, axes, completeExercise, initialCheckpointMemory, observerRegistry, validAmendment, validValidation } from "../sequenced-restoration-v6.5-intersecting-observer-quorum/fixtures.mjs";
export { audit, axes, completeExercise, initialCheckpointMemory, validAmendment, validValidation };

const NEW_KEYS = [
  { id: "e", publicKeyDer: "MCowBQYDK2VwAyEAYnDdOONJwF5SrRYmozIaHa2ItanOBoGnoRlGBELuPgg=", privateKeyDer: "MC4CAQAwBQYDK2VwBCIEIPIuKE+h6Ep8J+ox/u59UmYklw6YtBjwi5svaaZUzGyn" },
  { id: "f", publicKeyDer: "MCowBQYDK2VwAyEAKi48APWFHBOCUs4d/fBGVrj5F8UqOA1dIxgG6hAYwyQ=", privateKeyDer: "MC4CAQAwBQYDK2VwBCIEIB6tZHQfokk+T1dmLNsDQzhG0vb1+8X2jfimdUhaI7GB" }
];
const registryEntry = (key) => ({ observerId: `observer-${key.id}`, controller: `controller-${key.id}`,
  failureDomain: `domain-${key.id}`, publicKeyDer: key.publicKeyDer });
export function transitionFixture(memory, intersecting = true) {
  const newKeys = [OBSERVER_KEYS[2], OBSERVER_KEYS[3], ...NEW_KEYS];
  return { oldRegistry: observerRegistry(), newRegistry: newKeys.map(registryEntry),
    oldStatements: [OBSERVER_KEYS[0], OBSERVER_KEYS[2], OBSERVER_KEYS[3]].map((key) => observerStatement(memory, key)),
    newStatements: (intersecting ? [OBSERVER_KEYS[2], OBSERVER_KEYS[3], NEW_KEYS[0]] : [OBSERVER_KEYS[3], NEW_KEYS[0], NEW_KEYS[1]])
      .map((key) => observerStatement(memory, key)) };
}
