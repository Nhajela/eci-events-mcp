import { describe, expect, it } from "vitest";
import { verifyPkce } from "@/lib/oauth/pkce";

describe("PKCE S256", () => {
  it("accepts the RFC 7636 test vector", () => {
    expect(
      verifyPkce(
        "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
        "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
      ),
    ).toBe(true);
  });
  it("rejects a wrong verifier", () => {
    expect(
      verifyPkce(
        "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXX",
        "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
      ),
    ).toBe(false);
  });
  it("rejects a verifier that is too short", () => {
    expect(verifyPkce("short", "x")).toBe(false);
  });
});
