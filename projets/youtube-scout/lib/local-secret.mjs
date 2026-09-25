import { chmod, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

export function normalizeSecret(value) {
  const secret = String(value || "").trim();
  if (!/^[A-Za-z0-9_-]{20,200}$/.test(secret)) {
    throw new Error("Le jeton Discogs paraît incomplet ou contient des caractères inattendus.");
  }
  return secret;
}

export class LocalSecretFile {
  constructor(filePath) {
    this.filePath = filePath;
  }

  async load() {
    try {
      const secret = normalizeSecret(await readFile(this.filePath, "utf8"));
      await chmod(this.filePath, 0o600);
      return secret;
    } catch (error) {
      if (error.code === "ENOENT") return "";
      throw error;
    }
  }

  async save(value) {
    const secret = normalizeSecret(value);
    const directory = dirname(this.filePath);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await chmod(directory, 0o700);
    const temporary = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, `${secret}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
      await rename(temporary, this.filePath);
      await chmod(this.filePath, 0o600);
    } catch (error) {
      await rm(temporary, { force: true }).catch(() => {});
      throw error;
    }
  }

  async remove() {
    await rm(this.filePath, { force: true });
  }
}
