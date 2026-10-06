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
      const t = setTimeout(() => window.location.assign(state.redirectTo), 2500);
      return () => clearTimeout(t);
    }
    if (state.status === "error") track("key_rejected", { reason: state.code });
  }, [state]);

  if (state.status === "ok") {
    return (
      <div className="rounded-xl border border-teal-700 bg-teal-50 p-5">
        <h2 className="font-display text-xl font-semibold">Connected to {state.popupName}</h2>
        <p className="mt-2">
          Your key can: {state.scopes.join(", ")}. Taking you back to {clientName}…
        </p>
        <p className="mt-2 text-sm text-neutral-700">
          Looks wrong? Make a new key at{" "}
          <a className="underline" href={keyPage}>
            {keyPage.replace("https://", "")}
          </a>{" "}
          and connect again.
        </p>
        <a
          className="mt-4 inline-block rounded-md bg-neutral-900 px-4 py-2 font-medium text-white"
          href={state.redirectTo}
        >
          Continue
        </a>
      </div>
    );
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
