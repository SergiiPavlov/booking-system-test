"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type MeResponse = {
  user: {
    id: string;
    name: string;
    email: string;
    role: "CLIENT" | "BUSINESS";
  };
};

type AuthState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authed"; user: MeResponse["user"] };

export default function AuthStatus() {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<AuthState>({ status: "loading" });

  const isAuthPage = useMemo(() => pathname.startsWith("/sign-"), [pathname]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!isMounted) return;
        if (!res.ok) {
          setState({ status: "anonymous" });
          return;
        }
        const data = (await res.json()) as MeResponse;
        setState({ status: "authed", user: data.user });
      } catch {
        if (!isMounted) return;
        setState({ status: "anonymous" });
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  async function onSignOut() {
    try {
      await fetch("/api/auth/sign-out", { method: "POST" });
    } finally {
      setState({ status: "anonymous" });
      if (!isAuthPage) router.refresh();
      router.push("/sign-in");
    }
  }

  if (state.status === "loading") {
    return <span className="text-gray-400">Loading…</span>;
  }

  if (state.status === "anonymous") {
    return (
      <>
        <Link href="/sign-in" className="rounded-xl px-3 py-1.5 hover:bg-gray-800">
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className="rounded-xl border border-gray-700 bg-gray-900 px-3 py-1.5 hover:bg-gray-800"
        >
          Sign up
        </Link>
      </>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-gray-300">
        {state.user.name} <span className="text-gray-500">({state.user.role})</span>
      </span>
      <button
        type="button"
        onClick={onSignOut}
        className="rounded-xl border border-gray-700 px-3 py-1.5 hover:bg-gray-800"
      >
        Sign out
      </button>
    </div>
  );
}
