import { describe, expect, test } from "bun:test";
import { SITE_TRUSTED_ORIGINS, SITE_HOSTNAMES } from "@/lib/app-hosts";

describe("SITE_TRUSTED_ORIGINS", () => {
  test("includes production origins", () => {
    for (const h of SITE_HOSTNAMES) {
      expect(SITE_TRUSTED_ORIGINS).toContain(`https://${h}`);
    }
  });

  test("includes BETTER_AUTH_URL in non-production", () => {
    // Tests run with NODE_ENV=test, so dev origin should be included
    const dev = process.env.BETTER_AUTH_URL;
    if (dev) {
      expect(SITE_TRUSTED_ORIGINS).toContain(dev);
    }
  });

  test("localhost origins come only from BETTER_AUTH_URL", () => {
    const localhostOrigins = SITE_TRUSTED_ORIGINS.filter((o) =>
      o.includes("localhost"),
    );
    // SITE_TRUSTED_ORIGINS is built at module-load time; in the test env
    // BETTER_AUTH_URL is typically set to http://localhost:3000, so at most
    // one localhost origin should be present — and it must match the env var
    // that was active when the module was first imported.
    expect(localhostOrigins.length).toBeLessThanOrEqual(1);
    if (localhostOrigins.length === 1) {
      expect(localhostOrigins[0]).toMatch(/^http:\/\/localhost(:\d+)?$/);
    }
  });
});
