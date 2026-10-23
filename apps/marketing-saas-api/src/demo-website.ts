import type { WebsiteNetwork } from "./intake/network.server";
/** Only selected in explicitly labeled local demo mode for glanz.example. */
export const demoWebsite: WebsiteNetwork = {
  async resolve() {
    return [{ address: "93.184.216.34", family: 4 }];
  },
  async get(url) {
    return url.pathname === "/robots.txt"
      ? { status: 404, headers: {}, body: "" }
      : {
          status: 200,
          headers: { "content-type": "text/html" },
          body: "<title>Glanz Reinigung · synthetische Demo</title><h1>Glanz Reinigung</h1><p>Wir reinigen Büros in Düsseldorf.</p><p>Wir bieten Fensterreinigung an.</p>",
        };
  },
};
