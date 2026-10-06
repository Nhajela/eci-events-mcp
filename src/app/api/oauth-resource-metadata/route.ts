import { protectedResourceMetadata } from "@/lib/oauth/metadata";

export function GET() {
  return Response.json(protectedResourceMetadata(), {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}
