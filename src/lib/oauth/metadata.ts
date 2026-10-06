import { mcpUrl, origin } from "@/lib/env";

export function authServerMetadata(): Record<string, unknown> {
  const o = origin();
  return {
    issuer: o,
    authorization_endpoint: `${o}/oauth/authorize`,
    token_endpoint: `${o}/oauth/token`,
    registration_endpoint: `${o}/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    client_id_metadata_document_supported: true,
    authorization_response_iss_parameter_supported: true,
    service_documentation: `${o}/trust`,
  };
}

export function protectedResourceMetadata(): Record<string, unknown> {
  const o = origin();
  return {
    resource: mcpUrl(),
    authorization_servers: [o],
    bearer_methods_supported: ["header"],
    resource_name: "ECI Events MCP",
    resource_documentation: `${o}/trust`,
  };
}
