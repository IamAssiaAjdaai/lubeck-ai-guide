export function canBootstrapCanonicalRecord({
  created,
  existingLocalizationCount,
  updatedByUserId,
}: Readonly<{
  created: boolean;
  existingLocalizationCount: number;
  updatedByUserId: string | null;
}>): boolean {
  return (
    created ||
    (!updatedByUserId && existingLocalizationCount === 0)
  );
}
