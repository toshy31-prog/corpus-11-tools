import { createHash, createPrivateKey, createPublicKey, sign, verify } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { claimTcpChallenge } from "./claim-tcp-challenge.mjs";

const [statePath, holderId, privateKeyPath, requesterPublicKeyPath, registryPath, endpointPath, releasePath] = process.argv.slice(2);
if (!endpointPath) {
  process.stderr.write("usage: node serve-anchor-state-tcp.mjs STATE HOLDER_ID HOLDER_PRIVATE_KEY REQUESTER_PUBLIC_KEY CHALLENGE_REGISTRY ENDPOINT_FILE\n");
  process.exit(2);
}
const stateText = readFileSync(statePath, "utf8");
const state = JSON.parse(stateText);
const privateKey = createPrivateKey(readFileSync(privateKeyPath));
const requesterPublicKey = createPublicKey(readFileSync(requesterPublicKeyPath));
const bootId = readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim();
const digest = value => `sha256:${createHash("sha256").update(value).digest("hex")}`;

const server = createServer(socket => {
  let input = "";
  socket.on("data", chunk => input += chunk);
  socket.on("end", () => {
    try {
      const challenge = JSON.parse(input);
      const challengeBody = {
        schema: challenge.schema, requesterId: challenge.requesterId,
        requesterPid: challenge.requesterPid, requesterBootId: challenge.requesterBootId,
        nonce: challenge.nonce, issuedAtMs: challenge.issuedAtMs, expiresAtMs: challenge.expiresAtMs
      };
      const valid = challenge.schema === "cct-anchor-state-tcp-challenge/v2" &&
        verify(null, Buffer.from(JSON.stringify(challengeBody)), requesterPublicKey, Buffer.from(challenge.signatureBase64, "base64")) &&
        Date.now() >= challenge.issuedAtMs && Date.now() <= challenge.expiresAtMs;
      if (!valid) throw new Error("invalid requester challenge");
      const challengeDigest = digest(JSON.stringify(challengeBody));
      claimTcpChallenge(registryPath, {
        nonce: challenge.nonce, challengeDigest, requesterId: challenge.requesterId,
        acceptedAtMs: Date.now()
      });
      const body = {
        schema: "cct-anchor-state-tcp-response/v2", holderId,
        requesterId: challenge.requesterId, requesterPid: challenge.requesterPid,
        challengeDigest, stateDigest: digest(stateText),
        generation: state.generation, serverPid: process.pid, serverBootId: bootId, servedAtMs: Date.now()
      };
      const response = { ...body, stateBase64: Buffer.from(stateText).toString("base64"), signatureBase64: sign(null, Buffer.from(JSON.stringify(body)), privateKey).toString("base64") };
      socket.end(`${JSON.stringify(response)}\n`);
    } catch (error) {
      socket.destroy();
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    } finally {
      server.close();
      if (releasePath) {
        const timer = setInterval(() => { if (existsSync(releasePath)) clearInterval(timer); }, 25);
      }
    }
  });
});
server.listen(0, "127.0.0.1", () => {
  const address = server.address();
  writeFileSync(endpointPath, JSON.stringify({ host: address.address, port: address.port, serverPid: process.pid }));
});
