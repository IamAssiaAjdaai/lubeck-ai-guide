export const CITYWALK_SUPPORT_EMAIL = "support@getcitywalk.com" as const;
export const LEGAL_LAST_UPDATED = "19 October 2026" as const;

export type LegalEntityType = "individual" | "company";

export type LegalOperator = Readonly<{
  entityType?: LegalEntityType;
  name?: string;
  streetAddress?: string;
  postalCity?: string;
  country?: string;
  representative?: string;
  registerName?: string;
  registerNumber?: string;
  vatId?: string;
  supportEmail: typeof CITYWALK_SUPPORT_EMAIL;
  isConfigured: boolean;
  missingRequiredFields: readonly string[];
}>;

type LegalEnvironment = Readonly<Record<string, string | undefined>>;

function clean(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function entityType(value: string | undefined): LegalEntityType | undefined {
  const normalized = clean(value)?.toLowerCase();
  if (normalized === "individual" || normalized === "company") return normalized;
  return undefined;
}

export function getLegalOperator(
  environment: LegalEnvironment = process.env,
): LegalOperator {
  const type = entityType(environment.CITYWALK_LEGAL_ENTITY_TYPE);
  const name = clean(environment.CITYWALK_LEGAL_OPERATOR_NAME);
  const streetAddress = clean(environment.CITYWALK_LEGAL_OPERATOR_STREET_ADDRESS);
  const postalCity = clean(environment.CITYWALK_LEGAL_OPERATOR_POSTAL_CITY);
  const country = clean(environment.CITYWALK_LEGAL_OPERATOR_COUNTRY);
  const representative = clean(environment.CITYWALK_LEGAL_REPRESENTATIVE);
  const registerName = clean(environment.CITYWALK_LEGAL_REGISTER_NAME);
  const registerNumber = clean(environment.CITYWALK_LEGAL_REGISTER_NUMBER);

  const missingRequiredFields = [
    !type ? "operator type" : undefined,
    !name ? "operator name" : undefined,
    !streetAddress ? "street address" : undefined,
    !postalCity ? "postal code and city" : undefined,
    !country ? "country" : undefined,
    type === "company" && !representative ? "legal representative" : undefined,
    registerName && !registerNumber ? "registration number" : undefined,
    registerNumber && !registerName ? "register name" : undefined,
  ].filter((value): value is string => Boolean(value));

  return Object.freeze({
    ...(type ? { entityType: type } : {}),
    ...(name ? { name } : {}),
    ...(streetAddress ? { streetAddress } : {}),
    ...(postalCity ? { postalCity } : {}),
    ...(country ? { country } : {}),
    ...(representative ? { representative } : {}),
    ...(clean(environment.CITYWALK_LEGAL_REGISTER_NAME)
      ? { registerName: clean(environment.CITYWALK_LEGAL_REGISTER_NAME) }
      : {}),
    ...(clean(environment.CITYWALK_LEGAL_REGISTER_NUMBER)
      ? { registerNumber: clean(environment.CITYWALK_LEGAL_REGISTER_NUMBER) }
      : {}),
    ...(clean(environment.CITYWALK_LEGAL_VAT_ID)
      ? { vatId: clean(environment.CITYWALK_LEGAL_VAT_ID) }
      : {}),
    supportEmail: CITYWALK_SUPPORT_EMAIL,
    isConfigured: missingRequiredFields.length === 0,
    missingRequiredFields,
  });
}

export function legalRobots(operator: LegalOperator) {
  return operator.isConfigured
    ? { index: true, follow: true }
    : { index: false, follow: false };
}
