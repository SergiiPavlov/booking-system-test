'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { AUTH_CHANGED_EVENT } from '@/lib/client/auth-events';

type Me = { user: { id: string; role: 'CLIENT' | 'BUSINESS' | 'ADMIN'; name: string; email: string } | null };

type Role = 'CLIENT' | 'BUSINESS' | 'ADMIN';

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

  const [open, setOpen] = useState(false);

  const links: Array<{ href: string; label: string; show: boolean }> = [
    { href: '/', label: 'Home', show: true },
    { href: '/businesses', label: 'Businesses', show: true },
    { href: '/appointments', label: 'My appointments', show: isAuthed },
    { href: '/availability', label: 'Availability', show: role === 'BUSINESS' },
    { href: '/users', label: 'Users', show: role === 'ADMIN' },
  ];

  const visibleLinks = links.filter((l) => l.show);

  const close = () => setOpen(false);

  return (
    <nav className="relative">
      {/* Desktop */}
      <div className="hidden items-center gap-4 md:flex">
        {visibleLinks.map((l) => (
          <Link key={l.href} href={l.href} className="underline">
            {l.label}
          </Link>
        ))}
      </div>

      {/* Mobile: burger + dropdown */}
      <div className="flex items-center gap-3 md:hidden">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm hover:bg-gray-50"
          aria-expanded={open}
          aria-controls="nav-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 6h16" />
            <path d="M4 12h16" />
            <path d="M4 18h16" />
          </svg>
          Menu
        </button>

        {/* quick access (optional): show 1-2 top links even when menu closed */}
        <Link href="/" className="text-sm font-medium underline" onClick={close}>
          Home
        </Link>
      </div>

      {open && (
        <div
          id="nav-menu"
          className="absolute left-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-lg border bg-white shadow-lg"
        >
          <div className="flex flex-col p-2">
            {visibleLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-md px-3 py-2 text-sm text-gray-900 hover:bg-gray-50"
                onClick={close}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
