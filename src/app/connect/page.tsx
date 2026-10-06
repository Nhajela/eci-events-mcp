import { Analytics } from "@/components/analytics";
import { agenticAccessUrl } from "@/lib/env";
import { readAuthRequest } from "@/lib/oauth/authorize";
import { ConnectForm } from "./connect-form";

export const dynamic = "force-dynamic";

function returnTarget(redirectUri: string): string {
  try {
    const u = new URL(redirectUri);
    return u.protocol === "http:" || u.protocol === "https:" ? u.host : `${u.protocol}//`;
  } catch {
    return "the app that asked";
  }
}

export default async function Connect({
  searchParams,
}: {
  searchParams: Promise<{ req?: string }>;
}) {
  const { req = "" } = await searchParams;
  const auth = req ? await readAuthRequest(req) : null;
  return (
    <main className="mx-auto max-w-lg px-4 py-12 sm:px-6">
      <Analytics page="connect" />
      <h1 className="font-display text-3xl font-bold">Connect your EdgeOS key</h1>
      {auth ? (
        <>
          <p className="mt-3 text-neutral-700">
            <b>{auth.clientName}</b> wants to use the Edge City calendar as you. Paste your key
            below. We check it with EdgeOS, lock it inside a token for {auth.clientName}, and keep
            no copy.
          </p>
          <p className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-800">
            You'll be sent back to <b className="font-mono">{returnTarget(auth.redirectUri)}</b>. If
            that isn't the app you opened, close this page.
          </p>
          <div className="mt-6">
            <ConnectForm req={req} clientName={auth.clientName} keyPage={agenticAccessUrl()} />
          </div>
          <p className="mt-6 text-sm text-neutral-600">
            <a className="underline" href="/trust">
              How is this safe?
            </a>
          </p>
        </>
      ) : (
        <p className="mt-3 rounded-lg bg-amber-50 p-4 text-amber-900">
          This sign-in link has expired or is incomplete. Go back to your AI app and connect again.
        </p>
      )}
    </main>
  );
}
