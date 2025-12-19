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

  const [view, setView] = useState<"active" | "archive">("active");

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
    const tzOffsetMin = new Date().getTimezoneOffset();
    await api<PatchAppointmentResponse>(`/api/appointments/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ startAt, durationMin, tzOffsetMin })
    });
    await load();
    router.refresh();
  }

  if (loading) return <div className="text-gray-600">Loading…</div>;

  const canReschedule = isClient; // spec: only CLIENT can reschedule
  const canCancel = isClient || isBusiness; // UX: allow BUSINESS to cancel own appointments too

  const nowMs = Date.now();
  const activeItems = items.filter((a) => Date.parse(a.startAt) >= nowMs);
  const archiveItems = items.filter((a) => Date.parse(a.startAt) < nowMs);
  const visibleItems = view === "active" ? activeItems : archiveItems;

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-gray-800 bg-gray-900/30 p-5">
        <h2 className="text-lg font-semibold">My appointments</h2>
        <p className="mt-1 text-sm text-gray-600">
          View appointments. Reschedule is available only for CLIENT users. Cancel is available for CLIENT and BUSINESS
          users for their own appointments.
        </p>

        {me ? (
          <div className="mt-3 text-sm text-gray-700">
            Signed in as: <span className="font-semibold">{me.name}</span> ({me.role})
          </div>
        ) : null}


        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setView("active")}
            className={
              (view === "active"
                ? "bg-indigo-600 text-white border-indigo-700"
                : "bg-white text-gray-900 border-gray-300 hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-700") +
              " rounded-xl border px-3 py-1.5 text-sm font-medium cursor-pointer"
            }
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => setView("archive")}
            className={
              (view === "archive"
                ? "bg-indigo-600 text-white border-indigo-700"
                : "bg-white text-gray-900 border-gray-300 hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-700") +
              " rounded-xl border px-3 py-1.5 text-sm font-medium cursor-pointer"
            }
          >
            Archive
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-900 bg-red-950/40 p-3 text-sm text-red-200">{error}</div>
        ) : null}
      </section>

      <div className="overflow-hidden rounded-2xl border border-gray-800">
        {/* Desktop (sm+) table view */}
        <div className="hidden sm:block">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-900/60 text-left text-gray-700">
              <tr>
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Start</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {visibleItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-gray-600">
                    {view === "active" ? (
                      <>
                        No active appointments. Go to{" "}
                        <a href="/businesses" className="underline underline-offset-4">
                          Businesses
                        </a>
                        .
                      </>
                    ) : (
                      <>No past appointments.</>
                    )}</td>
                </tr>
              ) : null}

              {visibleItems.map((a) => (
                <AppointmentRow
                  key={a.id}
                  item={a}
                  canReschedule={canReschedule}
                  canCancel={canCancel}
                  onCancel={cancel}
                  onReschedule={reschedule}
                  readOnly={view === "archive"}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile (<sm) card view */}
        <div className="bg-gray-950/10 sm:hidden">
          {visibleItems.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-600">
              {view === "active" ? (
                      <>
                        No active appointments. Go to{" "}
                        <a href="/businesses" className="underline underline-offset-4">
                          Businesses
                        </a>
                        .
                      </>
                    ) : (
                      <>No past appointments.</>
                    )}</div>
          ) : null}

          <div className="divide-y divide-gray-800">
            {visibleItems.map((a) => (
              <AppointmentCard
                key={a.id}
                item={a}
                canReschedule={canReschedule}
                canCancel={canCancel}
                onCancel={cancel}
                onReschedule={reschedule}
                  readOnly={view === "archive"}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AppointmentRow({
  item,
  canReschedule,
  canCancel,
  onCancel,
  onReschedule,
  readOnly
}: {
  item: Appointment;
  canReschedule: boolean;
  canCancel: boolean;
  onCancel: (id: string) => Promise<void>;
  onReschedule: (id: string, localStart: string, durationMin: number) => Promise<void>;
  readOnly?: boolean;
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
        <div className="font-semibold text-gray-900">{businessLabel}</div>
        <div className="mt-1 text-xs text-gray-500">ID: {item.id}</div>
      </td>
      <td className="px-4 py-3">
        {editing ? (
          <input
            value={localStart}
            onChange={(e) => setLocalStart(e.target.value)}
            type="datetime-local"
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
          />
        ) : (
          <span className="text-gray-800">{formatLocal(item.startAt)}</span>
        )}
      </td>
      <td className="px-4 py-3">
        {editing ? (
          <select
            value={durationMin}
            onChange={(e) => setDurationMin(Number(e.target.value))}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
          >
            {[15, 30, 45, 60, 90, 120, 180, 240].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-gray-800">{item.durationMin} min</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span
          className={
            item.status === "BOOKED"
              ? "inline-flex rounded-full border border-emerald-300 bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800"
              : item.status === "CANCELED"
                ? "inline-flex rounded-full border border-rose-300 bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-800"
                : "inline-flex rounded-full border border-gray-300 bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800"
          }
        >
          {item.status}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {readOnly ? null : (canReschedule ? (
            editing ? (
              <>
                <button
                  type="button"
                  onClick={doSave}
                  disabled={busy}
                  className="rounded-xl whitespace-nowrap bg-white px-3 py-1.5 text-xs font-semibold text-gray-950 hover:bg-gray-100 disabled:opacity-70 cursor-pointer disabled:cursor-not-allowed"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  disabled={busy}
                  className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200"
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
                  className="rounded-xl border border-gray-300 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-900 hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200"
                >
                  Reschedule
                </button>
                {canCancel ? (
                  <button
                    type="button"
                    onClick={doCancel}
                    disabled={busy || !isBooked}
                    className="rounded-xl whitespace-nowrap border border-gray-300 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-900 hover:bg-rose-50 hover:border-rose-400 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 cursor-pointer disabled:cursor-not-allowed"
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
              className="rounded-xl whitespace-nowrap border border-gray-300 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-900 hover:bg-rose-50 hover:border-rose-400 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 cursor-pointer disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          ) : (
            <span className="text-xs text-gray-500">No actions</span>
          ))}

          {msg ? (
            <span className={msg.type === "ok" ? "text-xs text-emerald-300" : "text-xs text-red-300"}>{msg.text}</span>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function AppointmentCard({
  item,
  canReschedule,
  canCancel,
  onCancel,
  onReschedule,
  readOnly
}: {
  item: Appointment;
  canReschedule: boolean;
  canCancel: boolean;
  onCancel: (id: string) => Promise<void>;
  onReschedule: (id: string, localStart: string, durationMin: number) => Promise<void>;
  readOnly?: boolean;
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
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-semibold text-gray-900">{businessLabel}</div>
          <div className="mt-1 text-[11px] text-gray-500">ID: {item.id}</div>
        </div>

        <span
          className={
            item.status === "BOOKED"
              ? "inline-flex shrink-0 rounded-full border border-emerald-300 bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800"
              : item.status === "CANCELED"
                ? "inline-flex shrink-0 rounded-full border border-rose-300 bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-800"
                : "inline-flex shrink-0 rounded-full border border-gray-300 bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800"
          }
        >
          {item.status}
        </span>
      </div>

      <div className="mt-3 grid gap-3">
        <div className="grid grid-cols-3 items-center gap-3">
          <div className="text-xs font-semibold text-gray-600">Start</div>
          <div className="col-span-2">
            {editing ? (
              <input
                value={localStart}
                onChange={(e) => setLocalStart(e.target.value)}
                type="datetime-local"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
              />
            ) : (
              <span className="text-sm text-gray-800">{formatLocal(item.startAt)}</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 items-center gap-3">
          <div className="text-xs font-semibold text-gray-600">Duration</div>
          <div className="col-span-2">
            {editing ? (
              <select
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
              >
                {[15, 30, 45, 60, 90, 120, 180, 240].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-sm text-gray-800">{item.durationMin} min</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {readOnly ? null : (canReschedule ? (
            editing ? (
              <>
                <button
                  type="button"
                  onClick={doSave}
                  disabled={busy}
                  className="rounded-xl whitespace-nowrap bg-white px-3 py-2 text-sm font-semibold text-gray-950 hover:bg-gray-100 disabled:opacity-70 cursor-pointer disabled:cursor-not-allowed"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  disabled={busy}
                  className="rounded-xl whitespace-nowrap border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200 cursor-pointer disabled:cursor-not-allowed"
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
                  className="rounded-xl whitespace-nowrap border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 cursor-pointer disabled:cursor-not-allowed"
                >
                  Reschedule
                </button>
                {canCancel ? (
                  <button
                    type="button"
                    onClick={doCancel}
                    disabled={busy || !isBooked}
                    className="rounded-xl whitespace-nowrap border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-rose-50 hover:border-rose-400 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 cursor-pointer disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                ) : (
                  <span className="col-span-1 self-center text-xs text-gray-500">No actions</span>
                )}
              </>
            )
          ) : canCancel ? (
            <button
              type="button"
              onClick={doCancel}
              disabled={busy || !isBooked}
              className="col-span-2 rounded-xl whitespace-nowrap border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-rose-50 hover:border-rose-400 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 cursor-pointer disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          ) : (
            <span className="col-span-2 text-xs text-gray-500">No actions</span>
          ))}

          {msg ? (
            <div className="col-span-2">
              <span className={msg.type === "ok" ? "text-xs text-emerald-300" : "text-xs text-red-300"}>{msg.text}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
