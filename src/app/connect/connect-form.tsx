"use client";

import { useActionState, useEffect } from "react";
import { track } from "@/components/analytics";
import type { ConnectState } from "@/lib/oauth/authorize";
import { connect } from "./actions";

export function ConnectForm({
  req,
  clientName,
  keyPage,
}: {
  req: string;
  clientName: string;
  keyPage: string;
}) {
  const [state, action, pending] = useActionState<ConnectState, FormData>(connect, {
    status: "idle",
  });

  useEffect(() => {
    if (state.status === "ok") {
      track("key_accepted", { scopes: state.scopes.join(" ") });
    }
    if (state.status === "error") track("key_rejected", { reason: state.code });
  }, [state]);

  if (state.status === "ok") {
    return <ConnectedPanel state={state} clientName={clientName} keyPage={keyPage} />;
  }

  return (
    <form action={action} onSubmit={() => track("connect_started")} className="space-y-4">
      <input type="hidden" name="req" value={req} />
      <label htmlFor="key" className="block font-medium">
        Your EdgeOS API key
      </label>
      <input
        id="key"
        name="key"
        type="password"
        autoComplete="off"
        spellCheck={false}
        required
        placeholder="eos_live_…"
        className="w-full rounded-lg border border-neutral-300 px-3 py-3 font-mono focus-visible:outline-2 focus-visible:outline-teal-700"
      />
      <p className="text-sm text-neutral-600">
        Don't have one?{" "}
        <a className="underline" href={keyPage}>
          Make a key in the Edge City portal
        </a>
        .
      </p>
      {state.status === "error" && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-teal-700 px-4 py-3 font-medium text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {pending ? "Checking with EdgeOS…" : "Connect"}
      </button>
    </form>
  );
}

/** Success: no automatic redirect, so the attendee can read the scopes and go back when ready. */
export function ConnectedPanel({
  state,
  clientName,
  keyPage,
}: {
  state: Extract<ConnectState, { status: "ok" }>;
  clientName: string;
  keyPage: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-xl border border-teal-700 bg-teal-50 p-5"
    >
      <h2 className="font-display text-xl font-semibold">Connected to {state.popupName}</h2>
      <p className="mt-2">Your key can: {state.scopes.join(", ")}.</p>
      <a
        // biome-ignore lint/a11y/noAutofocus: the only next step after connecting; focus moves here so keyboard and screen reader users can continue
        autoFocus
        className="mt-4 block w-full rounded-lg bg-teal-700 px-4 py-3 text-center text-lg font-medium text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
        href={state.redirectTo}
      >
        Continue to {clientName}
      </a>
      <p className="mt-4 text-sm text-neutral-700">
        Looks wrong? Make a new key at{" "}
        <a className="underline" href={keyPage}>
          {keyPage.replace("https://", "")}
        </a>{" "}
        and connect again.
      </p>
    </div>
  );
}
