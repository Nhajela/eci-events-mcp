export const WRITE_SCOPES = ["rsvp:write", "events:write", "venues:write"] as const;
export type WriteScope = (typeof WRITE_SCOPES)[number];
export type Scope = "events:read" | WriteScope;
export const SCOPE_ORDER: Scope[] = ["events:read", ...WRITE_SCOPES];

export type PopupRef = {
  id: string;
  name: string;
  slug: string;
  startDate: string | null;
  endDate: string | null;
};

/** Everything a request needs to act as the attendee. Lives only inside sealed tokens and memory. */
export type Access = { key: string; scopes: Scope[]; popup: PopupRef };

export function hasScope(access: Access, scope: Scope): boolean {
  return access.scopes.includes(scope);
}
