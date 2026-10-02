ALTER TABLE "account" ALTER COLUMN "issuer" DROP NOT NULL;--> statement-breakpoint
DROP INDEX IF EXISTS "account_issuer_account_id_unique";
