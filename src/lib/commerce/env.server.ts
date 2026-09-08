export type StripeCheckoutEnvironment = Readonly<{
  secretKey: string;
}>;

export type StripeWebhookEnvironment = StripeCheckoutEnvironment &
  Readonly<{
    webhookSecret: string;
  }>;

function assertNoPublicSecrets(
  environment: Readonly<Record<string, string | undefined>>,
) {
  const forbidden = [
    "NEXT_PUBLIC_STRIPE_SECRET_KEY",
    "NEXT_PUBLIC_STRIPE_WEBHOOK_SECRET",
  ];

  for (const key of forbidden) {
    if (environment[key]?.trim()) {
      throw new Error(`${key} must never be configured in a public environment variable.`);
    }
  }
}

export function getStripeCheckoutEnvironment(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): StripeCheckoutEnvironment {
  assertNoPublicSecrets(environment);
  const secretKey = environment.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is required to create a hosted checkout session.");
  }

  return { secretKey };
}

export function getStripeWebhookEnvironment(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): StripeWebhookEnvironment {
  const checkout = getStripeCheckoutEnvironment(environment);
  const webhookSecret = environment.STRIPE_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is required to verify Stripe webhooks.");
  }

  return { ...checkout, webhookSecret };
}

export function getCommerceBaseUrl(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): string {
  const explicit = environment.BETTER_AUTH_URL?.trim();
  if (explicit) {
    const parsed = new URL(explicit);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("BETTER_AUTH_URL must use http or https.");
    }
    return parsed.origin;
  }

  const vercelUrl = environment.VERCEL_URL?.trim();
  if (!vercelUrl || !/^[a-z0-9.-]+$/i.test(vercelUrl)) {
    throw new Error("BETTER_AUTH_URL or VERCEL_URL is required for checkout return URLs.");
  }

  return `https://${vercelUrl}`;
}
