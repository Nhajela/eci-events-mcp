import { describe, expect, it } from "vitest";
import { authServerMetadata, protectedResourceMetadata } from "@/lib/oauth/metadata";
import { useTestSecrets } from "../../helpers";

// biome-ignore lint/correctness/useHookAtTopLevel: not a React hook; registers vitest beforeEach
useTestSecrets();

describe("metadata", () => {
  it("advertises CIMD, DCR, S256 and iss", () => {
    const m = authServerMetadata();
    expect(m).toMatchObject({
      issuer: "https://mcp.test",
      authorization_endpoint: "https://mcp.test/oauth/authorize",
      token_endpoint: "https://mcp.test/oauth/token",
      registration_endpoint: "https://mcp.test/oauth/register",
      code_challenge_methods_supported: ["S256"],
      client_id_metadata_document_supported: true,
      authorization_response_iss_parameter_supported: true,
      token_endpoint_auth_methods_supported: ["none"],
    });
  });
  it("points the resource at /api/mcp", () => {
    expect(protectedResourceMetadata()).toMatchObject({
      resource: "https://mcp.test/api/mcp",
      authorization_servers: ["https://mcp.test"],
    });
  });
});
