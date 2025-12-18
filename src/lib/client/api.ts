/**
 * Client-side API helpers for calling Next.js route handlers.
 * Keep this file browser-safe (no server-only imports).
 */

export type ApiErrorShape = {
  error: {
    code: string;
    message: string;
    details?: any;
  };
};

// Backward-compatible alias (older pages imported ApiErrorResponse)
export type ApiErrorResponse = ApiErrorShape;

export type UserRole = "CLIENT" | "BUSINESS" | "ADMIN";

export type UserDto = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
};

export type AppointmentStatus = "BOOKED" | "CANCELED";

export type AppointmentDto = {
  id: string;
  clientId: string;
  businessId: string;
  startAt: string; // ISO UTC
  durationMin: number;
  status: AppointmentStatus;
  createdAt?: string;
  updatedAt?: string;
  client?: Pick<UserDto, "id" | "name" | "email">;
  business?: Pick<UserDto, "id" | "name" | "email">;
};

export type BusinessAvailabilityDto = {
  slotStepMin: number;
  days: {
    dayOfWeek: number; // 0=Sun ... 6=Sat (UTC)
    startMin: number;
    endMin: number;
    breaks?: { startMin: number; endMin: number }[];
  }[];
};

export type AvailabilityDayInput = {
  dayOfWeek: number;
  enabled: boolean;
  start?: string;
  end?: string;
  breaks?: { start: string; end: string }[];
};

export type AvailabilityUpsertInput = {
  slotStepMin: number;
  days: AvailabilityDayInput[];
};

async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    // Cookies are HttpOnly; browser will send them automatically.
    credentials: "include",
  });

  // Try to parse JSON body for both ok/non-ok
  const text = await res.text();
  const json = text ? (JSON.parse(text) as any) : null;

  if (!res.ok) {
    if (json?.error) throw json as ApiErrorShape;
    throw {
      error: { code: "HTTP_ERROR", message: `HTTP ${res.status}`, details: json },
    } as ApiErrorShape;
  }

  return json as T;
}

/** Convert <input type="datetime-local"> value (local time) -> ISO UTC string */
export function toIsoUtcFromLocalDateTime(localValue: string): string {
  // localValue: "YYYY-MM-DDTHH:mm"
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(localValue);
  if (!m) throw new Error("Invalid local datetime value");
  const [_, yy, mo, dd, hh, mm] = m;
  const d = new Date(
    Number(yy),
    Number(mo) - 1,
    Number(dd),
    Number(hh),
    Number(mm),
    0,
    0
  );
  return d.toISOString();
}

/** Convert ISO UTC -> value for <input type="datetime-local"> (local time) */
export function toLocalInputValue(isoUtc: string): string {
  const d = new Date(isoUtc);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export function formatLocal(isoUtc: string): string {
  const d = new Date(isoUtc);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

/* ----------------------------- Auth ----------------------------- */

export async function signIn(input: { email: string; password: string }) {
  return apiFetch<{ user: UserDto }>("/api/auth/sign-in", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function signOut() {
  return apiFetch<{ ok: true }>("/api/auth/sign-out", { method: "POST" });
}

export async function getMe() {
  return apiFetch<{ user: UserDto }>("/api/auth/me");
}

/* --------------------------- Directory -------------------------- */

export async function getBusinesses() {
  // Route returns { users: [...] }
  return apiFetch<{ users: UserDto[] }>("/api/users?role=BUSINESS");
}

/* -------------------------- Appointments ------------------------- */

export async function createAppointment(input: {
  businessId: string;
  startAt: string; // ISO UTC
  durationMin: number;
}) {
  return apiFetch<{ appointment: AppointmentDto }>("/api/appointments", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function listMyAppointments() {
  return apiFetch<{ appointments: AppointmentDto[] }>("/api/appointments/me");
}

export async function cancelAppointment(id: string) {
  return apiFetch<{ appointment: Partial<AppointmentDto> }>(
    `/api/appointments/${id}/cancel`,
    { method: "POST" }
  );
}

export async function rescheduleAppointment(
  id: string,
  input: { startAt: string; durationMin: number }
) {
  return apiFetch<{ appointment: Partial<AppointmentDto> }>(
    `/api/appointments/${id}`,
    { method: "PATCH", body: JSON.stringify(input) }
  );
}

/* -------------------------- Availability ------------------------- */

export async function getAvailabilityMe() {
  return apiFetch<{ availability: BusinessAvailabilityDto | null }>("/api/availability/me");
}

export async function updateAvailabilityMe(input: AvailabilityUpsertInput) {
  return apiFetch<{ availability: BusinessAvailabilityDto }>("/api/availability/me", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function getFreeSlots(params: { businessId: string; date: string; durationMin: number }) {
  const q = new URLSearchParams({
    businessId: params.businessId,
    date: params.date,
    durationMin: String(params.durationMin),
  });
  return apiFetch<{ slots: string[] }>(`/api/availability/slots?${q.toString()}`);
}

/**
 * Convenience object for pages/components that prefer `api.*` namespace.
 * This is intentionally redundant to keep imports stable.
 */
export async function api<T>(input: string, init?: RequestInit): Promise<T> {
  return apiFetch<T>(input, init);
}

export const clientApi = {
  signIn,
  signOut,
  getMe,
  getBusinesses,
  createAppointment,
  listMyAppointments,
  cancelAppointment,
  rescheduleAppointment,
  getAvailabilityMe,
  updateAvailabilityMe,
  getFreeSlots,
};
