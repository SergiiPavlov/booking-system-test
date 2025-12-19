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
      const res = await getFreeSlots({
        businessId: b.id,
        date,
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
    <div className="rounded-2xl border border-gray-200 bg-white p-4 flex flex-col gap-4">
      <div>
        <div className="font-semibold">{b.name}</div>
        <div className="text-sm text-gray-600">{b.email}</div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:gap-2 sm:items-end">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-600">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
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
            className="w-full sm:w-32 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
          />
        </label>

        <button
          onClick={loadSlots}
          disabled={loading}
          className="w-full sm:w-auto rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-300 disabled:text-white/90 cursor-pointer disabled:cursor-not-allowed"
        >
          {loading ? "Loading..." : "Load slots"}
        </button>

        <button
          onClick={book}
          disabled={!chosen}
          className="w-full sm:w-auto rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:bg-emerald-300 disabled:text-white/90 cursor-pointer disabled:cursor-not-allowed"
        >
          Book selected
        </button>
      </div>

      {err && <div className="text-sm text-red-600">{err}</div>}
      {success && <div className="text-sm text-emerald-700">{success}</div>}

      <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-2">
        {slots.length === 0 && !loading ? (
          <div className="text-sm text-gray-600">
            No free slots for this day.
          </div>
        ) : null}

        {slots.map((s) => (
          <button
            key={s}
            onClick={() => setChosen(s)}
            className={`rounded-xl border px-3 py-2 text-sm font-semibold cursor-pointer ${
              chosen === s
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-gray-300 bg-white text-gray-900 hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-700"
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
    <main className="p-4 sm:p-6">
      <h1 className="text-2xl font-bold mb-4">Businesses</h1>
      {error && <div className="text-red-600 mb-4">{error}</div>}

      <div className="grid gap-4 sm:gap-5">
        {items.map((b) => (
          <BusinessCard key={b.id} b={b} />
        ))}
      </div>
    </main>
  );
}
