import { describe, expect, it } from "vitest";
import { resolveTesterAuth0Config } from "../src/lib/previewTesterAuth0";

const valid = {
  platform: "android",
  environment: "preview",
  apiOrigin: "https://api-preview.getcitywalk.com",
  domain: "citywalk-preview.eu.auth0.com",
  clientId: "test-public-client",
  packageName: "com.citywalk.app.preview",
};

describe("Preview tester Auth0 isolation", () => {
  it("accepts the isolated Android tester configuration", () => {
    expect(resolveTesterAuth0Config(valid)).toMatchObject({
      audience: valid.apiOrigin,
      customScheme: "citywalkpreviewauth0",
      scope: expect.stringContaining("citywalk:preview:read"),
    });
  });

  it("rejects production", () => {
    expect(() => resolveTesterAuth0Config({
      ...valid,
      environment: "production",
    })).toThrow();
  });

  it("rejects the production Android package", () => {
    expect(() => resolveTesterAuth0Config({
      ...valid,
      packageName: "com.citywalk.app",
    })).toThrow();
  });

  it("rejects a different Auth0 domain", () => {
    expect(() => resolveTesterAuth0Config({
      ...valid,
      domain: "wrong.example.com",
    })).toThrow();
  });

  it("requires the native public client ID", () => {
    expect(() => resolveTesterAuth0Config({
      ...valid,
      clientId: "",
    })).toThrow();
  });
});
