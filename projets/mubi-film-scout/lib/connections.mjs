import { chmod, readFile, rename, writeFile } from "node:fs/promises";

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
    const temporaryPath = `${filePath}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(values, null, 2)}\n`, { mode: 0o600 });
    await chmod(temporaryPath, 0o600);
    await rename(temporaryPath, filePath);
    await chmod(filePath, 0o600);
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
    const stored = await readStored();
    for (const id of SOURCE_IDS) {
      const value = cleanValue(values[id]);
      if (value) stored[id] = value;
    }
    await writeStored(stored);
    return status();
  }

  async function clear() {
    await writeStored({});
    return status();
  }

  return { get, status, save, clear };
}
