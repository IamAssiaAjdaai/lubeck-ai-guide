-- Nullable only for earlier local QA generations; new reservations always set both.
ALTER TABLE mkt_generations ADD COLUMN monthly_allocation integer CHECK(monthly_allocation>0);
ALTER TABLE mkt_generations ADD COLUMN monthly_budget_micro_eur bigint CHECK(monthly_budget_micro_eur>=0);
