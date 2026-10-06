export type ExternalAccountErasureOutcome = "erased" | "not_found";

export type ExternalAccountEraser = Readonly<{
  provider: string;
  erase: (input: Readonly<{ userId: string }>) => Promise<ExternalAccountErasureOutcome>;
}>;

export type ExternalAccountErasureResult = Readonly<{
  provider: string;
  outcome: ExternalAccountErasureOutcome;
}>;

export async function eraseExternalAccountData(input: Readonly<{
  userId: string;
  erasers: readonly ExternalAccountEraser[];
}>): Promise<readonly ExternalAccountErasureResult[]> {
  const results: ExternalAccountErasureResult[] = [];
  for (const eraser of input.erasers) {
    const outcome = await eraser.erase({ userId: input.userId });
    results.push({ provider: eraser.provider, outcome });
  }
  return results;
}
