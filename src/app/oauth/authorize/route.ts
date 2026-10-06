import { startAuthorize } from "@/lib/oauth/authorize";

export async function GET(request: Request) {
  const r = await startAuthorize(new URL(request.url).searchParams);
  if (r.kind === "redirect") return Response.redirect(new URL(r.location, request.url), 302);
  return new Response(r.message, {
    status: r.status,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
