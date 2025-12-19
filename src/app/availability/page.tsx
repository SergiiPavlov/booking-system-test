'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  getAvailabilityMe,
  updateAvailabilityMe,
  type AvailabilityDayInput
} from '@/lib/client/api';

type Role = 'CLIENT' | 'BUSINESS';

const DAYS: { d: number; name: string }[] = [
  { d: 1, name: 'Mon' },
  { d: 2, name: 'Tue' },
  { d: 3, name: 'Wed' },
  { d: 4, name: 'Thu' },
  { d: 5, name: 'Fri' },
  { d: 6, name: 'Sat' },
  { d: 0, name: 'Sun' }
];

function minToTime(min?: number): string {
  if (typeof min !== 'number' || Number.isNaN(min)) return '00:00';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function emptyDay(dayOfWeek: number): AvailabilityDayInput {
  return {
    dayOfWeek,
    enabled: dayOfWeek >= 1 && dayOfWeek <= 5,
    start: dayOfWeek === 6 ? '10:00' : '09:00',
    end: dayOfWeek === 6 ? '14:00' : '17:00',
    breaks:
      dayOfWeek >= 1 && dayOfWeek <= 5
        ? [{ start: '13:00', end: '14:00' }]
        : []
  };
}

export default function AvailabilityPage() {
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<AvailabilityDayInput[]>(
    DAYS.map((x) => emptyDay(x.d))
  );

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        // Reuse /api/auth/me for role-based UI gating
        const meRes = await fetch('/api/auth/me');
        if (meRes.ok) {
          const meJson = (await meRes.json()) as { user: { role: Role } };
          if (mounted) setRole(meJson.user.role);
        }

        const res = await getAvailabilityMe();
        const map = new Map<number, AvailabilityDayInput>();
        for (const d of res.availability?.days ?? []) {
          const fallback = emptyDay(d.dayOfWeek);
          map.set(d.dayOfWeek, {
            dayOfWeek: d.dayOfWeek,
            enabled: true,
            start: typeof d.startMin === 'number' ? minToTime(d.startMin) : fallback.start,
            end: typeof d.endMin === 'number' ? minToTime(d.endMin) : fallback.end,
            breaks: (d.breaks ?? []).map((b) => ({
              start: minToTime(b.startMin),
              end: minToTime(b.endMin)
            }))
          });
        }

        const next = DAYS.map((x) => map.get(x.d) ?? emptyDay(x.d));
        if (mounted) setDays(next);
      } catch (e: any) {
        // Most likely 403 when logged in as CLIENT.
        if (mounted) setError(e?.error?.message ?? 'Failed to load availability');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const canEdit = role === 'BUSINESS';

  const uiDays = useMemo(() => {
    return DAYS.map((meta) => ({
      ...meta,
      value: days.find((d) => d.dayOfWeek === meta.d) ?? emptyDay(meta.d)
    }));
  }, [days]);

  function updateDay(dayOfWeek: number, patch: Partial<AvailabilityDayInput>) {
    setDays((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d))
    );
  }

  function updateBreak(
    dayOfWeek: number,
    idx: number,
    patch: { start?: string; end?: string }
  ) {
    setDays((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d;
        const breaks = [...(d.breaks ?? [])];
        const current = breaks[idx] ?? { start: '13:00', end: '14:00' };
        breaks[idx] = { ...current, ...patch };
        return { ...d, breaks };
      })
    );
  }

  async function onSave() {
    if (!canEdit) return;

    setSaving(true);
    setError(null);

    try {
      const payload = {
        slotStepMin: 15,
        tzOffsetMin: new Date().getTimezoneOffset(),
        days: days.map((d) => ({
          dayOfWeek: d.dayOfWeek,
          enabled: d.enabled,
          start: d.start,
          end: d.end,
          breaks: (d.breaks ?? []).filter((b) => b.start && b.end)
        }))
      };

      await updateAvailabilityMe(payload);
    } catch (e: any) {
      setError(e?.error?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Availability</h1>
      <p className="text-sm text-gray-600">
        Business working hours and breaks. Slots are generated using the business
        timezone (based on your browser settings).
      </p>

      {loading && <div className="text-gray-600">Loading...</div>}

      {!loading && !canEdit && (
        <div className="p-3 border rounded bg-yellow-50">
          This page is available only for <b>BUSINESS</b> users.
        </div>
      )}

      {error && (
        <div className="p-3 border rounded bg-red-50 text-red-800">{error}</div>
      )}

      <div className="border rounded">
        {/*
          Почему не grid-cols-12:
          на некоторых ширинах/масштабах браузера элементы time-инпутов начинали
          визуально "наезжать" между колонками. Фиксируем колонки явными
          ширинами на md+ и делаем одну колонку на mobile.
        */}
        <div className="grid grid-cols-1 md:grid-cols-[120px_90px_260px_1fr] gap-2 p-3 text-sm font-medium border-b bg-gray-50">
          <div>Day</div>
          <div>Enabled</div>
          <div>Work</div>
          <div>Breaks</div>
        </div>

        {uiDays.map(({ d, name, value }) => (
          <div
            key={d}
            className="grid grid-cols-1 md:grid-cols-[120px_90px_260px_1fr] gap-2 p-3 border-b last:border-b-0 md:items-center"
          >
            <div className="font-medium">{name}</div>

            <div>
              <input
                type="checkbox"
                checked={value.enabled}
                disabled={!canEdit}
                onChange={(e) => updateDay(d, { enabled: e.target.checked })}
              />
            </div>

            <div className="flex gap-2">
              <input
                type="time"
                value={value.start}
                disabled={!canEdit || !value.enabled}
                onChange={(e) => updateDay(d, { start: e.target.value })}
                className="border rounded px-2 py-1 w-24"
              />
              <span className="text-gray-500 self-center">—</span>
              <input
                type="time"
                value={value.end}
                disabled={!canEdit || !value.enabled}
                onChange={(e) => updateDay(d, { end: e.target.value })}
                className="border rounded px-2 py-1 w-24"
              />
            </div>

            <div>
              <div className="flex flex-col gap-2">
                {(value.breaks ?? []).length === 0 && (
                  <div className="text-sm text-gray-500">No breaks</div>
                )}

                {(value.breaks ?? []).map((br, idx) => (
                  <div key={idx} className="flex flex-wrap items-center gap-2">
                    <input
                      type="time"
                      value={br.start}
                      disabled={!canEdit || !value.enabled}
                      onChange={(e) => updateBreak(d, idx, { start: e.target.value })}
                      className="border rounded px-2 py-1 w-28"
                    />
                    <span className="text-gray-500">—</span>
                    <input
                      type="time"
                      value={br.end}
                      disabled={!canEdit || !value.enabled}
                      onChange={(e) => updateBreak(d, idx, { end: e.target.value })}
                      className="border rounded px-2 py-1 w-28"
                    />
                  </div>
                ))}

                {(canEdit && value.enabled) && (
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    {(value.breaks ?? []).length < 2 && (
                      <button
                        type="button"
                        onClick={() =>
                          updateDay(d, {
                            breaks: [...(value.breaks ?? []), { start: '13:00', end: '14:00' }]
                          })
                        }
                        className="underline text-gray-700"
                      >
                        + Add break
                      </button>
                    )}

                    {(value.breaks ?? []).length > 0 && (
                      <button
                        type="button"
                        onClick={() => updateDay(d, { breaks: [] })}
                        className="underline text-gray-700"
                      >
                        Clear breaks
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={!canEdit || saving}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save availability'}
        </button>
      </div>
    </main>
  );
}
