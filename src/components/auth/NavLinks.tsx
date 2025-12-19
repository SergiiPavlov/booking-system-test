'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { AUTH_CHANGED_EVENT } from '@/lib/client/auth-events';

type Me = { user: { id: string; role: 'CLIENT' | 'BUSINESS'; name: string; email: string } | null };

type Role = 'CLIENT' | 'BUSINESS';

export function NavLinks() {
  // `user` в /api/auth/me может быть null — не используем Me['user']['role'] напрямую.
  const [role, setRole] = useState<Role | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const r = await fetch('/api/auth/me');
        if (!mounted) return;
        if (!r.ok) {
          setRole(null);
          setLoaded(true);
          return;
        }
        const data = (await r.json()) as Me;
        if (!mounted) return;
        setRole(data?.user?.role ?? null);
        setLoaded(true);
      } catch {
        if (!mounted) return;
        setRole(null);
        setLoaded(true);
      }
    };

    // Initial load
    void load();

    // Refresh when auth changes (sign-in / sign-out)
    const onAuthChanged = () => void load();
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);

    return () => {
      mounted = false;
      window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    };
  }, []);

  // Навигация:
  // - Home и Businesses — публичные
  // - My appointments — только для залогиненных
  // - Availability — только для BUSINESS
  const isAuthed = loaded && role !== null;

  return (
    <nav className="flex items-center gap-4">
      <Link href="/" className="underline">
        Home
      </Link>

      <Link href="/businesses" className="underline">
        Businesses
      </Link>

      {isAuthed && (
        <Link href="/appointments" className="underline">
          My appointments
        </Link>
      )}

      {role === 'BUSINESS' && (
        <Link href="/availability" className="underline">
          Availability
        </Link>
      )}
    </nav>
  );
}
