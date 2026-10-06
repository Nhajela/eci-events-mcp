import { buildInfo } from "@/lib/build";

export function GET() {
  return Response.json(buildInfo(), {
    headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" },
  });
}
