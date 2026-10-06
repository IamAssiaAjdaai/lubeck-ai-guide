export type ExternalAccountErasureOutcome = "erased" | "not_found";

export type ExternalAccountEraser = Readonly<{
  provider: string;
  erase: (input: Readonly<{ userId: string }>) => Promise<ExternalAccountErasureOutcome>;
}>;

export function findExternalAccountEraser(
  erasers: readonly ExternalAccountEraser[],
  provider: string,
): ExternalAccountEraser {
  const eraser = erasers.find((candidate) => candidate.provider === provider);
  if (!eraser) throw new Error(`No external account eraser configured for ${provider}.`);
  return eraser;
}
