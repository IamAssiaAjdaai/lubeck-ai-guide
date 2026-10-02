DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM "account"
		GROUP BY "provider_id", "account_id"
		HAVING count(*) > 1
	) THEN
		RAISE EXCEPTION 'Better Auth 1.7 migration aborted: duplicate (provider_id, account_id) account rows exist';
	END IF;
END
$$;--> statement-breakpoint
DROP INDEX IF EXISTS "account_issuer_account_id_unique";--> statement-breakpoint
ALTER TABLE "account" DROP COLUMN "issuer";
