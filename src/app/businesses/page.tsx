"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createAppointment,
  getBusinesses,
  getFreeSlots,
  type ApiErrorResponse
} from "@/lib/client/api";

type Business = { id: string; name: string; email: string };

function isoToLocalTimeLabel(iso: string) {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function buildDayRange(date: string) {
  // date = YYYY-MM-DD (local)
  const from = new Date(`${date}T00:00:00`);
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}

function BusinessCard({ b }: { b: Business }) {
  const today = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const [date, setDate] = useState(today);
  const [durationMin, setDurationMin] = useState(30);
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<string[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadSlots = async () => {
    setSuccess(null);
    setErr(null);
    setChosen(null);
    setLoading(true);
    try {
      const { from, to } = buildDayRange(date);
      const res = await getFreeSlots({
        businessId: b.id,
        from,
        to,
        durationMin
      });
      setSlots(res.slots);
    } catch (e: any) {
      const body = e as ApiErrorResponse;
      setErr(body?.error?.message ?? "Failed to load slots");
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const book = async () => {
    if (!chosen) return;
    setErr(null);
    setSuccess(null);
    try {
      await createAppointment({
        businessId: b.id,
        startAt: chosen,
        durationMin
      });
      setSuccess(`Booked for ${date} at ${isoToLocalTimeLabel(chosen)}`);
      // refresh slots to reflect conflicts
      await loadSlots();
    } catch (e: any) {
      const body = e as ApiErrorResponse;
      setErr(body?.error?.message ?? "Booking failed");
    }
  };

  useEffect(() => {
    // First load for convenience
    loadSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="border rounded p-4 flex flex-col gap-3">
      <div>
        <div className="font-semibold">{b.name}</div>
        <div className="text-sm text-gray-600">{b.email}</div>
      </div>

      <div className="flex flex-wrap gap-2 items-end">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-600">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-600">Duration (min)</span>
          <input
            type="number"
            min={15}
            max={240}
            step={15}
            value={durationMin}
            onChange={(e) => setDurationMin(Number(e.target.value))}
            className="border rounded px-2 py-1 w-32"
          />
        </label>

        <button
          onClick={loadSlots}
          disabled={loading}
          className="px-3 py-2 rounded bg-black text-white disabled:opacity-60"
        >
          {loading ? "Loading..." : "Load slots"}
        </button>

        <button
          onClick={book}
          disabled={!chosen}
          className="px-3 py-2 rounded bg-emerald-600 text-white disabled:opacity-60"
        >
          Book selected
        </button>
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}
      {success && <div className="text-sm text-emerald-700">{success}</div>}

      <div className="flex flex-wrap gap-2">
        {slots.length === 0 && !loading ? (
          <div className="text-sm text-gray-600">
            No free slots for this day.
          </div>
        ) : null}

        {slots.map((s) => (
          <button
            key={s}
            onClick={() => setChosen(s)}
            className={`px-3 py-2 rounded border text-sm ${
              chosen === s ? "bg-black text-white" : "bg-white"
            }`}
            title={s}
          >
            {isoToLocalTimeLabel(s)}
          </button>
        ))}
      </div>

      <div className="text-xs text-gray-500">
        Slots are generated from business availability and exclude already BOOKED
        appointments. Final conflict check still happens on the server (409).
      </div>
    </div>
  );
}

export default function BusinessesPage() {
  const [items, setItems] = useState<Business[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBusinesses()
      .then((data) => setItems(((data as any).users as Business[]) ?? []))
      .catch((e: any) => {
        const body = e as ApiErrorResponse;
        setError(body?.error?.message ?? "Failed to load businesses");
      });
  }, []);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Businesses</h1>
      {error && <div className="text-red-600 mb-4">{error}</div>}

      <div className="grid gap-4">
        {items.map((b) => (
          <BusinessCard key={b.id} b={b} />
        ))}
      </div>
    </main>
  );
}
