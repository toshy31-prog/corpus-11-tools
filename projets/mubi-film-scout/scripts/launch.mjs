import { mkdirSync, openSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const port = Number(process.env.PORT || 4180);
const url = `http://127.0.0.1:${port}`;
const runtimeDirectory = join(root, ".runtime");

async function serverReady() {
  try {
    const response = await fetch(`${url}/api/status`, { signal: AbortSignal.timeout(800) });
    return response.ok;
  } catch {
    return false;
  }
}

if (!await serverReady()) {
  mkdirSync(runtimeDirectory, { recursive: true, mode: 0o700 });
  const log = openSync(join(runtimeDirectory, "server.log"), "a", 0o600);
  const child = spawn(process.execPath, [join(root, "server.mjs")], {
    cwd: root,
    detached: true,
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", log, log]
  });
  child.unref();
  writeFileSync(join(runtimeDirectory, "server.pid"), `${child.pid}\n`, { mode: 0o600 });

  for (let attempt = 0; attempt < 40 && !await serverReady(); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 125));
  }
  if (!await serverReady()) throw new Error(`Le serveur n’a pas démarré. Consultez ${join(runtimeDirectory, "server.log")}.`);
}

console.log(`MUBI Film Scout est prêt : ${url}`);
if (!process.argv.includes("--no-open")) {
  const opener = spawn("xdg-open", [url], { detached: true, stdio: "ignore" });
  opener.on("error", () => console.log(`Ouvrez manuellement ${url}`));
  opener.unref();
}
