#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { lockProtocol, verifyProtocolLock } from "./protocol-lock.mjs";

const [command, inputPath, outputPath] = process.argv.slice(2);
if (!command || !inputPath || (command === "lock" && !outputPath)) {
  console.error("Usage: protocol-cli.mjs lock MANIFEST.json LOCK.json | verify LOCK.json");
  process.exit(2);
}

const input = JSON.parse(await readFile(inputPath, "utf8"));
if (command === "lock") {
  const lock = lockProtocol(input);
  await writeFile(outputPath, JSON.stringify(lock, null, 2) + "\n", { flag: "wx" });
  console.log(lock.protocolHash);
} else if (command === "verify") {
  verifyProtocolLock(input);
  console.log(input.protocolHash);
} else {
  console.error(`Unknown command: ${command}`);
  process.exit(2);
}
