import { and, eq } from "drizzle-orm";

import { loadDatabaseEnvironment } from "@/db/loadEnvironment";

loadDatabaseEnvironment();

const PRODUCT_SLUG = "lubeck-digital-guide-pass-72h";

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const [{ closeDb, getDb }, commerce] = await Promise.all([
    import("@/db/client"),
    import("@/db/commerceSchema"),
  ]);

  try {
    const result = await getDb().transaction(async (tx) => {
      const [existingProduct] = await tx
        .select({
          id: commerce.commerceProducts.id,
          active: commerce.commerceProducts.active,
        })
        .from(commerce.commerceProducts)
        .where(eq(commerce.commerceProducts.slug, PRODUCT_SLUG))
        .limit(1);
      const [product] = existingProduct
        ? await tx
            .update(commerce.commerceProducts)
            .set({
              name: "Lübeck Digital Guide Pass",
              description: "72-hour premium CITYWALK access for Lübeck.",
              kind: "city_pass",
              active: options.activate || existingProduct.active,
              updatedAt: new Date(),
            })
            .where(eq(commerce.commerceProducts.id, existingProduct.id))
            .returning()
        : await tx
            .insert(commerce.commerceProducts)
            .values({
              slug: PRODUCT_SLUG,
              name: "Lübeck Digital Guide Pass",
              description: "72-hour premium CITYWALK access for Lübeck.",
              kind: "city_pass",
              active: options.activate,
            })
            .returning();
      if (!product) throw new Error("Unable to provision the pass product.");

      await tx
        .insert(commerce.commerceProductGrants)
        .values({
          productId: product.id,
          scopeType: "city",
          scopeKey: "lubeck",
          durationDays: 3,
        })
        .onConflictDoUpdate({
          target: [
            commerce.commerceProductGrants.productId,
            commerce.commerceProductGrants.scopeType,
            commerce.commerceProductGrants.scopeKey,
          ],
          set: { durationDays: 3, updatedAt: new Date() },
        });

      let priceId: number | undefined;
      if (options.providerPriceId && options.unitAmount) {
        const [existingPrice] = await tx
          .select({
            id: commerce.commercePrices.id,
            active: commerce.commercePrices.active,
          })
          .from(commerce.commercePrices)
          .where(
            and(
              eq(commerce.commercePrices.provider, "stripe"),
              eq(
                commerce.commercePrices.providerPriceId,
                options.providerPriceId,
              ),
            ),
          )
          .limit(1);
        if (options.activate) {
          await tx
            .update(commerce.commercePrices)
            .set({ active: false, updatedAt: new Date() })
            .where(eq(commerce.commercePrices.productId, product.id));
        }
        const [price] = await tx
          .insert(commerce.commercePrices)
          .values({
            productId: product.id,
            provider: "stripe",
            providerPriceId: options.providerPriceId,
            currency: "eur",
            unitAmount: options.unitAmount,
            active: options.activate || existingPrice?.active || false,
          })
          .onConflictDoUpdate({
            target: [
              commerce.commercePrices.provider,
              commerce.commercePrices.providerPriceId,
            ],
            set: {
              productId: product.id,
              currency: "eur",
              unitAmount: options.unitAmount,
              active: options.activate || existingPrice?.active || false,
              updatedAt: new Date(),
            },
          })
          .returning({ id: commerce.commercePrices.id });
        priceId = price?.id;
      } else if (options.activate) {
        throw new Error(
          "--activate requires both --provider-price-id and --unit-amount.",
        );
      }

      const [grant] = await tx
        .select({ durationDays: commerce.commerceProductGrants.durationDays })
        .from(commerce.commerceProductGrants)
        .where(
          and(
            eq(commerce.commerceProductGrants.productId, product.id),
            eq(commerce.commerceProductGrants.scopeType, "city"),
            eq(commerce.commerceProductGrants.scopeKey, "lubeck"),
          ),
        )
        .limit(1);
      return { productId: product.id, priceId, grant, active: product.active };
    });

    console.log(
      `Provisioned ${PRODUCT_SLUG}: city:lubeck, ${result.grant?.durationDays ?? 0} days, ${result.active ? "active" : "inactive"}${result.priceId ? `, price ${result.priceId}` : ", no price"}.`,
    );
  } finally {
    await closeDb();
  }
}

function parseOptions(args: readonly string[]) {
  const providerPriceId = readOption(args, "provider-price-id");
  const amountValue = readOption(args, "unit-amount");
  const unitAmount = amountValue === undefined ? undefined : Number(amountValue);
  if ((providerPriceId && !unitAmount) || (!providerPriceId && unitAmount)) {
    throw new Error(
      "Provide both --provider-price-id and --unit-amount, or neither.",
    );
  }
  if (unitAmount !== undefined && (!Number.isSafeInteger(unitAmount) || unitAmount <= 0)) {
    throw new Error("--unit-amount must be a positive integer in minor currency units.");
  }
  return {
    providerPriceId,
    unitAmount,
    activate: args.includes("--activate"),
  } as const;
}

function readOption(args: readonly string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  return args.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Pass provisioning failed.");
  process.exitCode = 1;
});
