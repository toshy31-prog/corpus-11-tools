import { createHash } from "node:crypto";
import { verifySourceRegistryStatusHistory } from "./source-registry-status-history.mjs";

const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;
export const verifyPreviousStatusChainBundle = (bundle, previousStatus, policy) => {
  const registry = bundle?.registry, history = bundle?.history ?? [], result = verifySourceRegistryStatusHistory(history, registry, bundle?.initialAuthorityPublicKeyPem, bundle?.transitions ?? [], bundle?.nextAuthorityPublicKeyPems ?? []);
  const checks = {
    authenticChain: result.ok,
    terminalExactStatus: result.ok && result.statusDigest === digest(`${JSON.stringify(previousStatus)}\n`) && JSON.stringify(result.current) === JSON.stringify(previousStatus),
    policyRegistryBinding: registry?.stateDigest === policy?.controlRegistry?.sourceRegistry?.stateDigest,
    unresolvedIncidentPresent: (previousStatus?.knownEquivocationDigests?.length ?? 0) + (previousStatus?.knownRecoveryPolicyEquivocationDigests?.length ?? 0) > 0
  };
  return { ok: Object.values(checks).every(Boolean), checks };
};
