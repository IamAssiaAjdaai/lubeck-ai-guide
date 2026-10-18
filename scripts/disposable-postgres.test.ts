import { describe, expect, it } from "vitest";
import { disposablePostgresUrls } from "./lib/disposable-postgres";

describe("disposable PostgreSQL connection boundary", () => {
  it.each(["remote.example", "127.0.0.1.evil.example"])("rejects remote host %s", host => {
    expect(() => disposablePostgresUrls(`postgres://test:synthetic@${host}/local`, "cw_lifecycle")).toThrow(/loopback/);
  });
  it.each(["host=remote.example", "hostaddr=203.0.113.1", "port=5433", "database=production", "sslmode=require"])("rejects URL overrides: %s", query => {
    expect(() => disposablePostgresUrls(`postgres://test@localhost/local?${query}`, "cw_lifecycle")).toThrow(/overrides/);
  });
  it.each(["127.0.0.1", "localhost", "[::1]"])("pins %s and replaces only the database", host => {
    const result = disposablePostgresUrls(`postgresql://test:synthetic@${host}:5433/existing`, "cw_lifecycle");
    const target = new URL(result.databaseUrl);
    expect(target.hostname).toBe("127.0.0.1");
    expect(target.port).toBe("5433");
    expect(target.pathname).toMatch(/^\/cw_lifecycle_\d+$/);
    expect(new URL(result.adminUrl).pathname).toBe("/existing");
  });
  it("rejects malformed URLs and unsafe database name prefixes without echoing credentials", () => {
    expect(() => disposablePostgresUrls("synthetic-secret", "cw_lifecycle")).toThrow("Invalid integration database URL.");
    expect(() => disposablePostgresUrls("https://localhost/local", "cw_lifecycle")).toThrow(/loopback/);
    expect(() => disposablePostgresUrls("postgres://localhost/local", 'cw_x"')).toThrow(/loopback/);
  });
});
