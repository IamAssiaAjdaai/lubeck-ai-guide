import { loadDatabaseEnvironment } from "@/db/loadEnvironment";
import { isLocale } from "@/lib/i18n";

loadDatabaseEnvironment();

function parseOptions(args: readonly string[]) {
  const options = new Map<string, string>();
  for (const arg of args) {
    if (!arg.startsWith("--") || !arg.includes("=")) continue;
    const [key, ...parts] = arg.slice(2).split("=");
    options.set(key, parts.join("="));
  }
  return options;
}

async function main() {
  const [, , action, ...args] = process.argv;
  const options = parseOptions(args);
  const [{ closeDb }, operations] = await Promise.all([
    import("@/db/client"),
    import("@/lib/verifiedKnowledgeAdmin.server"),
  ]);

  try {
    if (action === "add") {
      const locale = options.get("locale") ?? "en";
      if (!isLocale(locale)) throw new Error("Unsupported knowledge locale.");
      const result = await operations.addVerifiedKnowledgeChunk({
        citySlug: options.get("city") ?? "",
        placeSlug: options.get("place") ?? "",
        sourceUrl: options.get("source") ?? "",
        locale,
        text: options.get("text") ?? "",
        topics: (options.get("topics") ?? "").split(",").filter(Boolean),
        priority: Number(options.get("priority") ?? 0),
      });
      console.log(`Created verified knowledge chunk ${result.id}.`);
      return;
    }

    if (action === "remove") {
      const removed = await operations.removeVerifiedKnowledgeChunk(options.get("id") ?? "");
      console.log(removed ? "Removed verified knowledge chunk." : "Knowledge chunk not found.");
      return;
    }

    if (action === "relink") {
      const result = await operations.relinkVerifiedKnowledgeChunkSource({
        id: options.get("id") ?? "",
        sourceUrl: options.get("source") ?? "",
      });
      console.log(
        `Relinked verified knowledge chunk ${result.id}; active state remains ${result.isActive}.`,
      );
      return;
    }

    throw new Error(
      "Usage: knowledge:manage -- add --city=<slug> --place=<slug> --source=<https-url> --locale=en --text=<verified-text> [--topics=a,b] [--priority=0]\n" +
      "   or: knowledge:manage -- relink --id=<uuid> --source=<attached-https-url>\n" +
      "   or: knowledge:manage -- remove --id=<uuid>",
    );
  } finally {
    await closeDb();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Knowledge operation failed.");
  process.exitCode = 1;
});
