import { exchangeToken, parseTokenBody } from "@/lib/oauth/token";

const headers = { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" };

export async function POST(request: Request) {
  const r = await exchangeToken(await parseTokenBody(request));
  return Response.json(r.body, { status: r.status, headers });
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      ...headers,
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Headers": "content-type",
    },
  });
}
