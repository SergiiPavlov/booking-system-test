export function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  // yyyy-MM-ddTHH:mm for datetime-local
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export function toIsoUtcFromLocalDateTime(local: string): string {
  // local like yyyy-MM-ddTHH:mm, interpret as local timezone and return ISO UTC
  const d = new Date(local);
  return d.toISOString();
}

export function formatLocal(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(d);
}

type ApiErrorShape = {
  error?: {
    code?: string;
    message?: string;
    details?: any;
  };
};

function formatApiError(payload: ApiErrorShape): string {
  const err = payload?.error;
  if (!err) return "Request failed";

  const parts: string[] = [];
  if (err.code) parts.push(err.code);
  if (err.message) parts.push(err.message);

  const details = err.details;
  // Expected validation error shape: { formErrors: string[], fieldErrors: Record<string, string[]> }
  if (details && typeof details === "object") {
    if (details.fieldErrors && typeof details.fieldErrors === "object") {
      const fieldLines = Object.entries(details.fieldErrors)
        .flatMap(([field, msgs]) => (Array.isArray(msgs) ? msgs.map((m) => `${field}: ${m}`) : []))
        .filter(Boolean);
      if (fieldLines.length) parts.push(fieldLines.join("; "));
    }
    if (Array.isArray(details.formErrors) && details.formErrors.length) {
      parts.push(details.formErrors.join("; "));
    }
  }

  return parts.join(" — ") || "Request failed";
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {})
    }
  });

  if (!res.ok) {
    let text = "";
    try {
      const json = (await res.json()) as ApiErrorShape;
      text = formatApiError(json);
    } catch {
      try {
        text = await res.text();
      } catch {
        text = "Request failed";
      }
    }
    throw new Error(text);
  }

  return (await res.json()) as T;
}
