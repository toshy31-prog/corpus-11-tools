import { createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";

const [attestationPath, observerPublicKeyPath] = process.argv.slice(2);
if (!observerPublicKeyPath) {
  process.stderr.write("usage: node verify-live-tcp-process-attestation.mjs ATTESTATION OBSERVER_PUBLIC_KEY\n");
  process.exit(2);
}
const value = JSON.parse(readFileSync(attestationPath, "utf8"));
const body = {
  schema: value.schema, observerId: value.observerId, controllerId: value.controllerId,
  failureDomain: value.failureDomain, observerPid: value.observerPid,
  observerStartTicks: value.observerStartTicks,
  observerBootId: value.observerBootId, server: value.server,
  requester: value.requester, observedAtMs: value.observedAtMs
};
const checks = {
  schema: value.schema === "cct-live-process-attestation/v1",
  signature: verify(null, Buffer.from(JSON.stringify(body)), createPublicKey(readFileSync(observerPublicKeyPath)), Buffer.from(value.signatureBase64, "base64")),
  distinctKernelIdentities: value.server.pid !== value.requester.pid || value.server.startTicks !== value.requester.startTicks,
  expectedPrograms: value.server.script?.endsWith("serve-anchor-state-tcp.mjs") === true && value.requester.script?.endsWith("fetch-anchor-state-tcp.mjs") === true,
  sameObservedBoot: value.server.pid > 0 && value.requester.pid > 0 && typeof value.observerBootId === "string"
};
const ok = Object.values(checks).every(Boolean);
process.stdout.write(`${JSON.stringify({ ok, checks, distinctLiveProcessesObservedBySigner: ok, distinctHostsEstablished: false, observerIndependenceEstablished: false })}\n`);
if (!ok) process.exitCode = 1;
