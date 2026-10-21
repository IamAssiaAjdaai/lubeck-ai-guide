import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LegalPage } from "@/components/legal/LegalPage";
import { getLegalOperator, legalRobots } from "@/lib/legal";
const identity = {
  CITYWALK_LEGAL_ENTITY_TYPE: "individual",
  CITYWALK_LEGAL_OPERATOR_NAME: "Synthetic Operator",
  CITYWALK_LEGAL_OPERATOR_STREET_ADDRESS: "Synthetic Street 1",
  CITYWALK_LEGAL_OPERATOR_POSTAL_CITY: "12345 Synthetic City",
  CITYWALK_LEGAL_OPERATOR_COUNTRY: "Germany",
};
describe("legal publication gate", () => {
  it.each([{}, identity, { CITYWALK_LEGAL_PUBLICATION_APPROVED: "1" }])("withholds draft and partial identity without both gates", environment => {
    const operator = getLegalOperator(environment);
    const html = renderToStaticMarkup(<LegalPage title="Privacy" eyebrow="Legal" intro="Notice" operator={operator}><p>Sensitive draft identity</p></LegalPage>);
    expect(html).not.toContain("Sensitive draft identity");
    expect(html).toContain("awaiting operator and legal approval");
    expect(legalRobots(operator).index).toBe(false);
  });
  it("renders only after complete identity and explicit publication approval", () => {
    const operator = getLegalOperator({ ...identity, CITYWALK_LEGAL_PUBLICATION_APPROVED: "1" });
    expect(legalRobots(operator).index).toBe(true);
    expect(renderToStaticMarkup(<LegalPage title="Terms" eyebrow="Legal" intro="Notice" operator={operator}>Reviewed notice</LegalPage>)).toContain("Reviewed notice");
  });
});
