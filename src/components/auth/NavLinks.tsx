'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Me = { user: { id: string; role: 'CLIENT' | 'BUSINESS'; name: string; email: string } };

export function NavLinks() {
  const [role, setRole] = useState<Me['user']['role'] | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch('/api/auth/me')
      .then(async (r) => {
        if (!r.ok) return null;
        return (await r.json()) as Me;
      })
      .then((data) => {
        if (!mounted) return;
        setRole(data?.user.role ?? null);
        setLoaded(true);
      })
      .catch(() => {
        if (!mounted) return;
        setRole(null);
        setLoaded(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // While not loaded, render basic links (avoid layout jump)
  const showAuthLinks = loaded ? role !== null : true;

  return (
    <nav className="flex items-center gap-4">
      <Link href="/" className="underline">
        Home
      </Link>

      {showAuthLinks && (
        <>
          <Link href="/businesses" className="underline">
            Businesses
          </Link>
          <Link href="/appointments" className="underline">
            My appointments
          </Link>
        </>
      )}

      {role === 'BUSINESS' && (
        <Link href="/availability" className="underline">
          Availability
        </Link>
      )}
    </nav>
  );
}
