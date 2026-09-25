import { chmod, readFile, rename, open, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { setTimeout as pause } from "node:timers/promises";

export const SOURCE_IDS = Object.freeze(["tmdb", "guardian", "nyt", "omdb"]);

function cleanValue(value) {
  if (typeof value !== "string") return "";
  const cleaned = value.trim();
  if (!cleaned) return "";
  if (cleaned.length > 4096 || /[\u0000-\u001f\u007f]/.test(cleaned)) {
    throw Object.assign(new Error("Une clé contient des caractères invalides."), { status: 400 });
  }
  return cleaned;
}

export function createConnectionStore(filePath, environment = {}) {
  const environmentValues = {
    tmdb: cleanValue(environment.TMDB_READ_TOKEN),
    guardian: cleanValue(environment.GUARDIAN_API_KEY),
    nyt: cleanValue(environment.NYT_API_KEY),
    omdb: cleanValue(environment.OMDB_API_KEY)
  };

  async function readStored() {
    try {
      const parsed = JSON.parse(await readFile(filePath, "utf8"));
      return Object.fromEntries(
        SOURCE_IDS.map((id) => [id, cleanValue(parsed?.[id])]).filter(([, value]) => value)
      );
    } catch (error) {
      if (error.code === "ENOENT") return {};
      if (error instanceof SyntaxError) {
        throw Object.assign(new Error("Le coffre local des accès est illisible."), { status: 500 });
      }
      throw error;
    }
  }

  async function writeStored(values) {
    const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
    try {
      const handle = await open(temporaryPath, "wx", 0o600);
      try { await handle.writeFile(`${JSON.stringify(values, null, 2)}\n`); await handle.sync(); }
      finally { await handle.close(); }
      await rename(temporaryPath, filePath);
      await chmod(filePath, 0o600);
    } finally { await unlink(temporaryPath).catch(() => {}); }
  }

  // Exclusive across stores and processes. A stale lock fails closed rather
  // than deleting a lock that could still belong to another writer.
  async function transaction(task) {
    const lockPath = `${filePath}.lock`;
    const deadline = Date.now() + 3000;
    let lock;
    while (!lock) {
      try { lock = await open(lockPath, "wx", 0o600); }
      catch (error) {
        if (error.code !== "EEXIST") throw error;
        if (Date.now() >= deadline) throw Object.assign(new Error("Le coffre est occupé ou son verrou doit être vérifié. Aucun accès n’a été modifié ; réessayez."), { status: 409 });
        await pause(25);
      }
    }
    try { return await task(); }
    finally { await lock.close(); await unlink(lockPath); }
  }

  async function get(id) {
    if (!SOURCE_IDS.includes(id)) return "";
    if (environmentValues[id]) return environmentValues[id];
    return (await readStored())[id] || "";
  }

  async function status() {
    const stored = await readStored();
    return Object.fromEntries(SOURCE_IDS.map((id) => [id, {
      configured: Boolean(environmentValues[id] || stored[id]),
      origin: environmentValues[id] ? "environment" : stored[id] ? "local" : null
    }]));
  }

  async function save(values) {
    if (!values || typeof values !== "object" || Array.isArray(values)) {
      throw Object.assign(new Error("Configuration invalide."), { status: 400 });
    }
    const cleaned = Object.fromEntries(SOURCE_IDS.map((id) => [id, cleanValue(values[id])]).filter(([, value]) => value));
    return transaction(async () => {
      await writeStored({ ...await readStored(), ...cleaned });
      return status();
    });
  }

  async function clear() {
    return transaction(async () => { await writeStored({}); return status(); });
  }

  return { get, status, save, clear };
}
