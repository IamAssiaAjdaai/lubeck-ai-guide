// Synthetic upgrade assertions for the disposable loopback billing runner only.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

export async function verifyNativeBillingUpgrade(pool) {
  const identity = (await pool.query("select current_database() as name, inet_server_addr() as address")).rows[0];
  assert.match(identity.name, /^cw_billing_\d+$/);
  assert.equal((await pool.query("select count(*)::int as n from information_schema.tables where table_schema='public'")).rows[0].n, 0);
  console.log("Safety PASS: fresh empty disposable loopback PostgreSQL; no accounts/orders/entitlements or remote env loaded.");
  // Pin the reviewed pre-0015 baseline so the upgrade test still works after this feature is committed.
  const baselineRef = "cba060b4d54e545b6476e088d15d4b8599510c32";
  const committed = path => execFileSync("git", ["show", `${baselineRef}:${path}`], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const baseline = JSON.parse(committed("drizzle/meta/_journal.json"));
  const journal = JSON.parse(await readFile("drizzle/meta/_journal.json", "utf8"));
  assert.equal(baseline.entries.at(-1).tag, "0014_orange_vision");
  assert.equal(journal.entries.at(-1).tag, "0015_majestic_lake");
  assert.deepEqual(journal.entries.slice(0, -1), baseline.entries);
  const folder = await mkdtemp(join(tmpdir(), "citywalk-billing-baseline-"));
  try {
    await mkdir(join(folder, "meta"));
    // Exact committed journal, not a modified journal or manually inserted DB entry.
    await writeFile(join(folder, "meta/_journal.json"), committed("drizzle/meta/_journal.json"));
    for (const entry of baseline.entries) {
      const sql = committed(`drizzle/${entry.tag}.sql`);
      assert.equal(await readFile(`drizzle/${entry.tag}.sql`, "utf8"), sql);
      await writeFile(join(folder, `${entry.tag}.sql`), sql);
    }
    await migrate(drizzle(pool), { migrationsFolder: folder });
    assert.equal((await pool.query('select count(*)::int as n from drizzle.__drizzle_migrations')).rows[0].n, 15);
    const columns = async () => (await pool.query("select column_name, is_nullable, column_default from information_schema.columns where table_schema='public' and table_name='commerce_orders' order by ordinal_position")).rows;
    const indexes = async () => (await pool.query("select indexname,indexdef from pg_indexes where schemaname='public' order by indexname")).rows;
    const beforeColumns = await columns(), beforeIndexes = await indexes();
    for (const name of ["price_id", "currency", "amount_total"]) assert.equal(beforeColumns.find(c => c.column_name === name).is_nullable, "NO");

    for (const state of ["active", "revoked", "expired"]) {
      await pool.query('insert into "user" (id,name,email) values ($1,$2,$3)', [`upgrade-${state}`, "Synthetic migration traveler", `upgrade-${state}@example.test`]);
    }
    await pool.query('insert into account (id,account_id,provider_id,issuer,user_id,password) values ($1,$2,$3,$4,$5,$6)', ["upgrade-account","upgrade-active","credential","credential","upgrade-active","synthetic-not-a-real-password-hash"]);
    await pool.query('insert into session (id,expires_at,token,user_id) values ($1,now()+interval \'1 day\',$2,$3)', ["upgrade-session","synthetic-migration-token","upgrade-active"]);
    await pool.query("insert into traveler_profiles (user_id,preferred_locale) values ('upgrade-active','de')");
    const product = (await pool.query("insert into commerce_products (slug,name,kind,active) values ('upgrade-legacy-lubeck','Synthetic 72h Lübeck pass','city_pass',true) returning id")).rows[0].id;
    const price = (await pool.query("insert into commerce_prices (product_id,provider,provider_price_id,currency,unit_amount,active) values ($1,'stripe','synthetic-upgrade-price','eur',699,true) returning id", [product])).rows[0].id;
    await pool.query("insert into commerce_product_grants (product_id,scope_type,scope_key,duration_days) values ($1,'city','lubeck',3)", [product]);
    for (const state of ["active", "revoked", "expired"]) {
      await pool.query("insert into commerce_orders (id,user_id,product_id,price_id,provider,provider_payment_intent_id,status,currency,amount_total,paid_at) values ($1,$2,$3,$4,'stripe',$5,$6,'eur',699,now())", [`upgrade-order-${state}`,`upgrade-${state}`,product,price,`synthetic-upgrade-tx-${state}`,state === "revoked" ? "refunded" : "paid"]);
      await pool.query("insert into commerce_entitlements (user_id,product_id,source_order_id,scope_type,scope_key,status,granted_at,expires_at) values ($1,$2,$3,'city','lubeck',$4::commerce_entitlement_status,now()-interval '1 hour',case when $4::commerce_entitlement_status='expired' then now()-interval '1 hour' else now()+interval '71 hours' end)", [`upgrade-${state}`,product,`upgrade-order-${state}`,state]);
    }
    await pool.query("insert into commerce_provider_events (provider,provider_event_id,event_type,outcome) values ('stripe','synthetic-upgrade-event','checkout.session.completed','processed')");
    // Pre-0015 permits a native-labelled candidate only with complete financial fields.
    await pool.query("insert into commerce_orders (id,user_id,product_id,price_id,provider,provider_payment_intent_id,status,currency,amount_total) values ('upgrade-native-candidate','upgrade-active',$1,$2,'apple_sandbox','synthetic-candidate','pending','eur',699)", [product,price]);
    const route={citySlug:"lubeck",stopSlugs:["holstentor"],settings:{minutes:120,interests:["history"],walking:"balanced",start:{lat:53.8,lng:10.6}}};
    await pool.query("insert into account_saved_walks (user_id,city_slug,fingerprint,route) values ('upgrade-active','lubeck','synthetic-upgrade-route',$1::jsonb)", [JSON.stringify(route)]);
    const tables = ['user','account','session','traveler_profiles','commerce_products','commerce_prices','commerce_product_grants','commerce_orders','commerce_entitlements','commerce_provider_events','account_saved_walks'];
    const snapshot = async () => Object.fromEntries(await Promise.all(tables.map(async table => [table,(await pool.query(`select to_jsonb(t) as row from "${table}" t order by to_jsonb(t)::text`)).rows])));
    const before = await snapshot();
    assert.equal(before.commerce_orders.length,4);assert.equal(before.commerce_entitlements.length,3);assert.equal(before.account_saved_walks.length,1);
    assert.equal(before.account.length,1);assert.equal(before.session.length,1);
    await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
    assert.deepEqual(await snapshot(),before);
    const afterColumns=await columns();
    assert.deepEqual(afterColumns,beforeColumns.map(c=>["price_id","currency","amount_total"].includes(c.column_name)?{...c,is_nullable:"YES"}:c));
    assert.deepEqual(await indexes(),beforeIndexes);
    const constraints = async () => (await pool.query("select conname,pg_get_constraintdef(oid) as definition from pg_constraint where conrelid='commerce_orders'::regclass order by conname")).rows;
    const afterConstraints=await constraints();
    assert.equal(afterConstraints.filter(c=>c.conname==='commerce_orders_financial_evidence').length,1);
    const migrationHash=createHash('sha256').update(await readFile('drizzle/0015_majestic_lake.sql','utf8')).digest('hex');
    const recorded=(await pool.query('select hash,created_at from drizzle.__drizzle_migrations order by id')).rows;
    assert.equal(recorded.length,16);assert.equal(recorded.filter(r=>r.hash===migrationHash).length,1);
    assert.equal(Number(recorded.at(-1).created_at),journal.entries.at(-1).when);
    await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
    assert.deepEqual((await pool.query('select hash,created_at from drizzle.__drizzle_migrations order by id')).rows,recorded);
    assert.deepEqual(await constraints(),afterConstraints);assert.deepEqual(await indexes(),beforeIndexes);assert.deepEqual(await snapshot(),before);
    console.log("Upgrade 0000–0014 -> 0015 PASS: 11 synthetic table snapshots preserved; 4 orders, 3 entitlements, auth account/session and Saved Walk unchanged.");
    console.log("Rerun PASS: journal 16 entries, exact 0015 hash recorded once; one financial-evidence constraint, indexes/defaults unchanged, no data loss.");
  } finally { await rm(folder,{recursive:true,force:true}); }
}
