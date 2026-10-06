import { authServerMetadata } from "@/lib/oauth/metadata";

export function GET() {
  return Response.json(authServerMetadata(), { headers: { "Access-Control-Allow-Origin": "*" } });
}
