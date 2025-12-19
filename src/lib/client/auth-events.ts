// Simple client-side event bus to notify persistent UI (header) that auth state changed.
// We cannot read httpOnly cookies directly, so we refetch /api/auth/me on these events.

export const AUTH_CHANGED_EVENT = "auth:changed" as const;

export function emitAuthChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}
