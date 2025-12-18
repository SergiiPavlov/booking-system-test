"use client";

import { api, toIsoUtcFromLocalDateTime } from "@/lib/client/api";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type UserRole = "CLIENT" | "BUSINESS";

type MeResponse = {
  user: { id: string; name: string; email: string; role: UserRole };
};

type Business = {
  id: string;
  name: string;
  email: string;
};

type ListBusinessesResponse = { users: Business[] };

type CreateAppointmentResponse = {
  appointment: {
    id: string;
    clientId: string;
    businessId: string;
    startAt: string;
    durationMin: number;
    status: "BOOKED" | "CANCELED";
    createdAt: string;
    updatedAt: string;
  };
};

export default function BusinessesPage() {
  const router = useRouter();

  const [me, setMe] = useState<MeResponse["user"] | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canBook = useMemo(() => me?.role === "CLIENT", [me]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        if (!meRes.ok) {
          router.replace(`/sign-in?next=${encodeURIComponent("/businesses")}`);
          return;
        }
        const meData = (await meRes.json()) as MeResponse;
        if (!mounted) return;
        setMe(meData.user);

        const list = await api<ListBusinessesResponse>("/api/users?role=BUSINESS");
        if (!mounted) return;
        setBusinesses(list.users);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load businesses");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function onBook(businessId: string, localStart: string, durationMin: number) {
    const startAt = toIsoUtcFromLocalDateTime(localStart);
    return api<CreateAppointmentResponse>("/api/appointments", {
      method: "POST",
      body: JSON.stringify({ businessId, startAt, durationMin })
    });
  }

  if (loading) {
    return <div className="text-gray-400">Loading…</div>;
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-gray-800 bg-gray-900/30 p-5">
        <h2 className="text-lg font-semibold">Businesses</h2>
        <p className="mt-1 text-sm text-gray-400">
          Choose a business and create an appointment. Times are submitted as UTC (we convert from your local time).
        </p>

        {me ? (
          <div className="mt-3 text-sm text-gray-300">
            Signed in as: <span className="font-semibold">{me.name}</span> ({me.role})
          </div>
        ) : null}

        {!canBook ? (
          <div className="mt-3 rounded-xl border border-amber-900 bg-amber-950/20 p-3 text-sm text-amber-200">
            You are signed in as BUSINESS. Only CLIENT users can create appointments.
          </div>
        ) : null}

        {error ? <div className="mt-4 rounded-xl border border-red-900 bg-red-950/40 p-3 text-sm text-red-200">{error}</div> : null}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        {businesses.map((b) => (
          <BusinessCard key={b.id} business={b} canBook={canBook} onBook={onBook} />
        ))}
      </div>
    </div>
  );
}

function BusinessCard({
  business,
  canBook,
  onBook
}: {
  business: { id: string; name: string; email: string };
  canBook: boolean;
  onBook: (businessId: string, localStart: string, durationMin: number) => Promise<CreateAppointmentResponse>;
}) {
  const router = useRouter();
  const [localStart, setLocalStart] = useState("");
  const [durationMin, setDurationMin] = useState(60);
  const [status, setStatus] = useState<{ type: "ok" | "err"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setSubmitting(true);
    try {
      const res = await onBook(business.id, localStart, durationMin);
      setStatus({ type: "ok", message: `Booked. Appointment ID: ${res.appointment.id}` });
      setLocalStart("");
      router.refresh();
    } catch (err) {
      setStatus({ type: "err", message: err instanceof Error ? err.message : "Booking failed" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/20 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold">{business.name}</div>
          <div className="mt-1 text-sm text-gray-400">{business.email}</div>
        </div>
        <span className="rounded-full border border-gray-700 px-2 py-1 text-xs text-gray-300">BUSINESS</span>
      </div>

      <div className="mt-3 text-xs text-gray-500">ID: {business.id}</div>

      {canBook ? (
        <form onSubmit={submit} className="mt-4 grid gap-3">
          <label className="grid gap-2">
            <span className="text-sm text-gray-300">Start time</span>
            <input
              value={localStart}
              onChange={(e) => setLocalStart(e.target.value)}
              type="datetime-local"
              className="rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-600"
              required
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm text-gray-300">Duration (minutes)</span>
            <select
              value={durationMin}
              onChange={(e) => setDurationMin(Number(e.target.value))}
              className="rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-600"
            >
              {[15, 30, 45, 60, 90, 120, 180, 240].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>

          {status ? (
            <div
              className={
                status.type === "ok"
                  ? "rounded-xl border border-emerald-900 bg-emerald-950/20 p-3 text-sm text-emerald-200"
                  : "rounded-xl border border-red-900 bg-red-950/40 p-3 text-sm text-red-200"
              }
            >
              {status.message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Booking…" : "Book"}
          </button>
        </form>
      ) : (
        <div className="mt-4 text-sm text-gray-500">Sign in as CLIENT to book.</div>
      )}
    </div>
  );
}
