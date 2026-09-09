import { createPrivateKey, randomBytes, sign } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { connect } from "node:net";
import { atomicReplaceDurable } from "./atomic-replace.mjs";

const [endpointPath, requesterId, requesterPrivateKeyPath, challengePath, responsePath, statePath, transcriptPath, releasePath, networkReadyPath, networkReleasePath] = process.argv.slice(2);
if (!transcriptPath) {
  process.stderr.write("usage: node fetch-anchor-state-tcp.mjs ENDPOINT REQUESTER_ID REQUESTER_PRIVATE_KEY CHALLENGE RESPONSE STATE TRANSCRIPT\n");
  process.exit(2);
}
const endpoint = JSON.parse(readFileSync(endpointPath, "utf8"));
const now = Date.now();
const challengeBody = {
  schema: "cct-anchor-state-tcp-challenge/v2", requesterId, requesterPid: process.pid,
  requesterBootId: readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim(),
  nonce: randomBytes(24).toString("hex"), issuedAtMs: now, expiresAtMs: now + 60_000
};
const challenge = { ...challengeBody, signatureBase64: sign(null, Buffer.from(JSON.stringify(challengeBody)), createPrivateKey(readFileSync(requesterPrivateKeyPath))).toString("base64") };
atomicReplaceDurable(challengePath, `${JSON.stringify(challenge)}\n`);

let transport;
let output = "";
const socket = connect(endpoint.port, endpoint.host, () => {
  transport = { localAddress: socket.localAddress, localPort: socket.localPort, remoteAddress: socket.remoteAddress, remotePort: socket.remotePort };
  if (networkReadyPath && networkReleasePath) {
    atomicReplaceDurable(networkReadyPath, `${JSON.stringify({ schema: "cct-live-tcp-ready/v1", clientPid: process.pid, serverPid: endpoint.serverPid, ...transport })}\n`);
    const timer = setInterval(() => {
      if (existsSync(networkReleasePath)) {
        clearInterval(timer);
        socket.end(JSON.stringify(challenge));
      }
    }, 25);
  } else {
    socket.end(JSON.stringify(challenge));
  }
});
socket.on("data", chunk => output += chunk);
socket.on("end", () => {
  const response = JSON.parse(output);
  atomicReplaceDurable(responsePath, `${JSON.stringify(response)}\n`);
  atomicReplaceDurable(statePath, Buffer.from(response.stateBase64, "base64").toString("utf8"));
  atomicReplaceDurable(transcriptPath, `${JSON.stringify({ schema: "cct-anchor-tcp-transcript/v2", clientPid: process.pid, serverPid: response.serverPid, ...transport })}\n`);
  if (releasePath) {
    const timer = setInterval(() => { if (existsSync(releasePath)) clearInterval(timer); }, 25);
  }
});
