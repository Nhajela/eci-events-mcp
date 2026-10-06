import { authServerMetadata } from "@/lib/oauth/metadata";

export function GET() {
  return Response.json(authServerMetadata(), { headers: { "Access-Control-Allow-Origin": "*" } });
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Allow-Headers": "content-type",
    },
  });
}
