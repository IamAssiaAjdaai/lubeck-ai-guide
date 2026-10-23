import { constants } from "node:fs";
import { mkdir, open, unlink, lstat, link, readdir } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

/** Server-owned UUIDs only. Atomic no-replace publication; no user paths or public URLs. */
export class PrivateMedia {
  constructor(readonly directory: string) {}
  private path(key: string) {
    return join(this.directory, z.uuid().parse(key));
  }
  private async ensureDirectory() {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const stat = await lstat(this.directory);
    if (!stat.isDirectory() || stat.isSymbolicLink() || stat.mode & 0o077)
      throw new Error("PRIVATE_DIRECTORY_REQUIRED");
  }
  async write(key: string, data: Buffer) {
    if (data.length > 8 * 1024 * 1024)
      throw new Error("PRIVATE_ASSET_SIZE_LIMIT");
    const final = this.path(key);
    await this.ensureDirectory();
    const temporary = final + ".pending";
    const file = await open(
      temporary,
      constants.O_WRONLY |
        constants.O_CREAT |
        constants.O_EXCL |
        constants.O_NOFOLLOW,
      0o600,
    );
    try {
      await file.writeFile(data);
      await file.sync();
    } finally {
      await file.close();
    }
    // link is atomic and cannot overwrite an existing key. A crash leaves a recoverable .pending file.
    await link(temporary, final);
    await unlink(temporary);
  }
  async read(key: string) {
    const file = await open(
      this.path(key),
      constants.O_RDONLY | constants.O_NOFOLLOW,
    );
    try {
      const stat = await file.stat();
      if (!stat.isFile() || stat.size > 8 * 1024 * 1024)
        throw new Error("INVALID_PRIVATE_ASSET");
      return await file.readFile();
    } finally {
      await file.close();
    }
  }
  async remove(key: string) {
    try {
      await unlink(this.path(key));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
  }
  /** Operator-only reconciliation; caller must hold the DB namespace's exclusive storage lock. */
  async pruneOrphans(referenced: Set<string>, before: Date) {
    await this.ensureDirectory();
    let removed = 0,
      failed = 0,
      retained = 0;
    for (const name of await readdir(this.directory)) {
      const pending = name.endsWith(".pending"),
        key = pending ? name.slice(0, -8) : name;
      if (!z.uuid().safeParse(key).success) continue;
      const path = join(this.directory, name);
      try {
        const stat = await lstat(path);
        if (
          !stat.isFile() ||
          stat.isSymbolicLink() ||
          stat.mtimeMs >= +before ||
          (!pending && referenced.has(key))
        ) {
          retained++;
          continue;
        }
        await unlink(path);
        removed++;
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "ENOENT") failed++;
      }
    }
    return { removed, failed, retained };
  }
}
