import { exchangeToken, parseTokenBody } from "@/lib/oauth/token";
import { scrubKeys } from "@/lib/scrub";

const headers = { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" };

export async function POST(request: Request) {
  try {
    const r = await exchangeToken(await parseTokenBody(request));
    return Response.json(r.body, { status: r.status, headers });
  } catch (err) {
    // One JSON line, scrubbed; never the request body or headers.
    const message = scrubKeys(err instanceof Error ? err.message : String(err));
    console.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        scope: "oauth_token",
        status: "server_error",
        message,
      }),
    );
    return Response.json(
      { error: "server_error", error_description: "Something went wrong." },
      { status: 500, headers },
    );
  }
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
