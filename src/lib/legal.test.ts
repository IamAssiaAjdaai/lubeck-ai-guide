import { describe, expect, it } from "vitest";

import { getLegalOperator, legalRobots } from "@/lib/legal";

describe("legal operator configuration", () => {
  it.each(["CITYWALK_LEGAL_REGISTER_NAME", "CITYWALK_LEGAL_REGISTER_NUMBER"])("rejects a partial register pair: %s", (field) => {
    const operator = getLegalOperator({
      CITYWALK_LEGAL_ENTITY_TYPE: "individual",
      CITYWALK_LEGAL_OPERATOR_NAME: "Synthetic Operator",
      CITYWALK_LEGAL_OPERATOR_STREET_ADDRESS: "Synthetic Street 1",
      CITYWALK_LEGAL_OPERATOR_POSTAL_CITY: "12345 Synthetic City",
      CITYWALK_LEGAL_OPERATOR_COUNTRY: "Germany",
      [field]: "Synthetic registration",
    });
    expect(operator.isConfigured).toBe(false);
    expect(legalRobots(operator).index).toBe(false);
  });
  it("fails closed when the public operator identity is missing", () => {
    const operator = getLegalOperator({});

    expect(operator.isConfigured).toBe(false);
    expect(operator.missingRequiredFields).toEqual([
      "operator type",
      "operator name",
      "street address",
      "postal code and city",
      "country",
    ]);
    expect(legalRobots(operator)).toEqual({ index: false, follow: false });
  });

  it("accepts a complete individual operator identity", () => {
    const operator = getLegalOperator({
      CITYWALK_LEGAL_ENTITY_TYPE: "individual",
      CITYWALK_LEGAL_OPERATOR_NAME: "Example Operator",
      CITYWALK_LEGAL_OPERATOR_STREET_ADDRESS: "Example Street 1",
      CITYWALK_LEGAL_OPERATOR_POSTAL_CITY: "12345 Example City",
      CITYWALK_LEGAL_OPERATOR_COUNTRY: "Germany",
    });

    expect(operator.isConfigured).toBe(true);
    expect(operator.missingRequiredFields).toEqual([]);
    expect(legalRobots(operator)).toEqual({ index: true, follow: true });
  });

  it("requires a representative for a company operator", () => {
    const incomplete = getLegalOperator({
      CITYWALK_LEGAL_ENTITY_TYPE: "company",
      CITYWALK_LEGAL_OPERATOR_NAME: "Example GmbH",
      CITYWALK_LEGAL_OPERATOR_STREET_ADDRESS: "Example Street 1",
      CITYWALK_LEGAL_OPERATOR_POSTAL_CITY: "12345 Example City",
      CITYWALK_LEGAL_OPERATOR_COUNTRY: "Germany",
    });

    expect(incomplete.isConfigured).toBe(false);
    expect(incomplete.missingRequiredFields).toContain("legal representative");

    const complete = getLegalOperator({
      CITYWALK_LEGAL_ENTITY_TYPE: "company",
      CITYWALK_LEGAL_OPERATOR_NAME: "Example GmbH",
      CITYWALK_LEGAL_OPERATOR_STREET_ADDRESS: "Example Street 1",
      CITYWALK_LEGAL_OPERATOR_POSTAL_CITY: "12345 Example City",
      CITYWALK_LEGAL_OPERATOR_COUNTRY: "Germany",
      CITYWALK_LEGAL_REPRESENTATIVE: "Example Person",
    });

    expect(complete.isConfigured).toBe(true);
  });

  it("normalizes empty optional register and VAT values away", () => {
    const operator = getLegalOperator({
      CITYWALK_LEGAL_ENTITY_TYPE: "individual",
      CITYWALK_LEGAL_OPERATOR_NAME: "Example Operator",
      CITYWALK_LEGAL_OPERATOR_STREET_ADDRESS: "Example Street 1",
      CITYWALK_LEGAL_OPERATOR_POSTAL_CITY: "12345 Example City",
      CITYWALK_LEGAL_OPERATOR_COUNTRY: "Germany",
      CITYWALK_LEGAL_REGISTER_NAME: "   ",
      CITYWALK_LEGAL_REGISTER_NUMBER: "",
      CITYWALK_LEGAL_VAT_ID: " ",
    });

    expect(operator).not.toHaveProperty("registerName");
    expect(operator).not.toHaveProperty("registerNumber");
    expect(operator).not.toHaveProperty("vatId");
  });
});
