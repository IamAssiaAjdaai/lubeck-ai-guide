import path from "node:path";

import { config } from "dotenv";

export function loadDatabaseEnvironment(root = process.cwd()): void {
  config({
    path: [path.join(root, ".env.local"), path.join(root, ".env")],
    override: false,
    quiet: true,
  });
}
