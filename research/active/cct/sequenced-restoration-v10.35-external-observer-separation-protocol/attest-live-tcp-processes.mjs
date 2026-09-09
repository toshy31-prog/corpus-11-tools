import { createHash, createPrivateKey, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import { atomicReplaceDurable } from "./atomic-replace.mjs";

const [endpointPath, challengePath, observerId, controllerId, failureDomain, observerPrivateKeyPath, attestationPath, releasePath, releaseMode = "release"] = process.argv.slice(2);
if (!releasePath) {
  process.stderr.write("usage: node attest-live-tcp-processes.mjs ENDPOINT CHALLENGE OBSERVER_ID CONTROLLER_ID FAILURE_DOMAIN OBSERVER_PRIVATE_KEY ATTESTATION RELEASE [hold|release]\n");
  process.exit(2);
}
const endpoint = JSON.parse(readFileSync(endpointPath, "utf8"));
const challenge = JSON.parse(readFileSync(challengePath, "utf8"));
const readProcess = pid => {
  const stat = readFileSync(`/proc/${pid}/stat`, "utf8").trim();
  const close = stat.lastIndexOf(")");
  const fieldsAfterName = stat.slice(close + 2).split(/\s+/);
  const cmdline = readFileSync(`/proc/${pid}/cmdline`).toString("utf8").split("\0").filter(Boolean);
  return {
    pid,
    startTicks: fieldsAfterName[19],
    commandDigest: `sha256:${createHash("sha256").update(JSON.stringify(cmdline)).digest("hex")}`,
    script: cmdline.find(value => value.endsWith(".mjs")) ?? null
  };
};
const body = {
  schema: "cct-live-process-attestation/v1",
  observerId,
  controllerId,
  failureDomain,
  observerPid: process.pid,
  observerStartTicks: readProcess(process.pid).startTicks,
  observerBootId: readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim(),
  server: readProcess(endpoint.serverPid),
  requester: readProcess(challenge.requesterPid),
  observedAtMs: Date.now()
};
const attestation = { ...body, signatureBase64: sign(null, Buffer.from(JSON.stringify(body)), createPrivateKey(readFileSync(observerPrivateKeyPath))).toString("base64") };
atomicReplaceDurable(attestationPath, `${JSON.stringify(attestation)}\n`);
if (releaseMode === "release") {
  atomicReplaceDurable(releasePath, `${JSON.stringify({ schema: "cct-process-release/v1", attestationDigest: `sha256:${createHash("sha256").update(JSON.stringify(body)).digest("hex")}` })}\n`);
} else if (releaseMode !== "hold") {
  throw new Error("release mode must be hold or release");
}
