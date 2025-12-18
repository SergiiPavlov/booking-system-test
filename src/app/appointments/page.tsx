"use client";

import { api, formatLocal, toIsoUtcFromLocalDateTime, toLocalInputValue } from "@/lib/client/api";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type UserRole = "CLIENT" | "BUSINESS";

type MeResponse = {
  user: { id: string; name: string; email: string; role: UserRole };
};

type Appointment = {
  id: string;
  clientId: string;
  businessId: string;
  startAt: string;
  durationMin: number;
  status: "BOOKED" | "CANCELED";
  createdAt: string;
  updatedAt: string;
  client?: { id: string; name: string; email: string };
  business?: { id: string; name: string; email: string };
};

type ListMyAppointmentsResponse = { appointments: Appointment[] };

type PatchAppointmentResponse = { appointment: Partial<Appointment> & { id: string } };

export default function MyAppointmentsPage() {
  const router = useRouter();

  const [me, setMe] = useState<MeResponse["user"] | null>(null);
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isClient = useMemo(() => me?.role === "CLIENT", [me]);
  const isBusiness = useMemo(() => me?.role === "BUSINESS", [me]);

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const meRes = await fetch("/api/auth/me", { cache: "no-store" });
      if (!meRes.ok) {
        router.replace(`/sign-in?next=${encodeURIComponent("/appointments")}`);
        return;
      }
      const meData = (await meRes.json()) as MeResponse;
      setMe(meData.user);

      const list = await api<ListMyAppointmentsResponse>("/api/appointments/me");
      setItems(list.appointments);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cancel(id: string) {
    await api<PatchAppointmentResponse>(`/api/appointments/${id}/cancel`, { method: "POST" });
    await load();
    router.refresh();
  }

  async function reschedule(id: string, localStart: string, durationMin: number) {
    const startAt = toIsoUtcFromLocalDateTime(localStart);
    await api<PatchAppointmentResponse>(`/api/appointments/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ startAt, durationMin })
    });
    await load();
    router.refresh();
  }

  if (loading) return <div className="text-gray-400">Loading…</div>;

  const canReschedule = isClient; // spec: only CLIENT can reschedule
  const canCancel = isClient || isBusiness; // UX: allow BUSINESS to cancel own appointments too

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-gray-800 bg-gray-900/30 p-5">
        <h2 className="text-lg font-semibold">My appointments</h2>
        <p className="mt-1 text-sm text-gray-400">
          View appointments. Reschedule is available only for CLIENT users. Cancel is available for CLIENT and BUSINESS
          users for their own appointments.
        </p>

        {me ? (
          <div className="mt-3 text-sm text-gray-300">
            Signed in as: <span className="font-semibold">{me.name}</span> ({me.role})
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-xl border border-red-900 bg-red-950/40 p-3 text-sm text-red-200">{error}</div>
        ) : null}
      </section>

      <div className="overflow-hidden rounded-2xl border border-gray-800">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-900/60 text-left text-gray-300">
            <tr>
              <th className="px-4 py-3">Business</th>
              <th className="px-4 py-3">Start</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-gray-400">
                  No appointments yet. Go to{" "}
                  <a href="/businesses" className="underline underline-offset-4">
                    Businesses
                  </a>
                  .
                </td>
              </tr>
            ) : null}

            {items.map((a) => (
              <AppointmentRow
                key={a.id}
                item={a}
                canReschedule={canReschedule}
                canCancel={canCancel}
                onCancel={cancel}
                onReschedule={reschedule}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AppointmentRow({
  item,
  canReschedule,
  canCancel,
  onCancel,
  onReschedule
}: {
  item: Appointment;
  canReschedule: boolean;
  canCancel: boolean;
  onCancel: (id: string) => Promise<void>;
  onReschedule: (id: string, localStart: string, durationMin: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [localStart, setLocalStart] = useState(toLocalInputValue(item.startAt));
  const [durationMin, setDurationMin] = useState(item.durationMin);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const businessLabel = item.business?.name ?? item.businessId;

  async function doCancel() {
    setMsg(null);
    setBusy(true);
    try {
      await onCancel(item.id);
    } catch (err) {
      setMsg({ type: "err", text: err instanceof Error ? err.message : "Cancel failed" });
    } finally {
      setBusy(false);
    }
  }

  async function doSave() {
    setMsg(null);
    setBusy(true);
    try {
      await onReschedule(item.id, localStart, durationMin);
      setEditing(false);
      setMsg({ type: "ok", text: "Updated" });
    } catch (err) {
      setMsg({ type: "err", text: err instanceof Error ? err.message : "Update failed" });
    } finally {
      setBusy(false);
    }
  }

  const isBooked = item.status === "BOOKED";

  return (
    <tr className="bg-gray-950/10">
      <td className="px-4 py-3">
        <div className="font-semibold text-gray-100">{businessLabel}</div>
        <div className="mt-1 text-xs text-gray-500">ID: {item.id}</div>
      </td>
      <td className="px-4 py-3">
        {editing ? (
          <input
            value={localStart}
            onChange={(e) => setLocalStart(e.target.value)}
            type="datetime-local"
            className="w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-600"
          />
        ) : (
          <span className="text-gray-200">{formatLocal(item.startAt)}</span>
        )}
      </td>
      <td className="px-4 py-3">
        {editing ? (
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
        ) : (
          <span className="text-gray-200">{item.durationMin} min</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span
          className={
            item.status === "BOOKED"
              ? "inline-flex rounded-full border border-emerald-900 bg-emerald-950/20 px-2 py-1 text-xs text-emerald-200"
              : "inline-flex rounded-full border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-300"
          }
        >
          {item.status}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {canReschedule ? (
            editing ? (
              <>
                <button
                  type="button"
                  onClick={doSave}
                  disabled={busy}
                  className="rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-gray-950 hover:bg-gray-100 disabled:opacity-70"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  disabled={busy}
                  className="rounded-xl border border-gray-700 px-3 py-1.5 text-xs hover:bg-gray-800 disabled:opacity-70"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  disabled={busy || !isBooked}
                  className="rounded-xl border border-gray-700 px-3 py-1.5 text-xs hover:bg-gray-800 disabled:opacity-50"
                >
                  Reschedule
                </button>
                {canCancel ? (
                  <button
                    type="button"
                    onClick={doCancel}
                    disabled={busy || !isBooked}
                    className="rounded-xl border border-gray-700 px-3 py-1.5 text-xs hover:bg-gray-800 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                ) : null}
              </>
            )
          ) : canCancel ? (
            <button
              type="button"
              onClick={doCancel}
              disabled={busy || !isBooked}
              className="rounded-xl border border-gray-700 px-3 py-1.5 text-xs hover:bg-gray-800 disabled:opacity-50"
            >
              Cancel
            </button>
          ) : (
            <span className="text-xs text-gray-500">No actions</span>
          )}

          {msg ? (
            <span className={msg.type === "ok" ? "text-xs text-emerald-300" : "text-xs text-red-300"}>{msg.text}</span>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
