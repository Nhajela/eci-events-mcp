"use server";

import { type ConnectState, completeAuthorize } from "@/lib/oauth/authorize";

export async function connect(_prev: ConnectState, form: FormData): Promise<ConnectState> {
  return completeAuthorize(String(form.get("req") ?? ""), String(form.get("key") ?? ""));
}
