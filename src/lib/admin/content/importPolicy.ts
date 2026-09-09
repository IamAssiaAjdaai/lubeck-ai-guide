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

export function canRefreshCanonicalLocalization({
  recordUpdatedByUserId,
  localizationUpdatedByUserId,
}: Readonly<{
  recordUpdatedByUserId: string | null;
  localizationUpdatedByUserId: string | null;
}>): boolean {
  return !recordUpdatedByUserId && !localizationUpdatedByUserId;
}
