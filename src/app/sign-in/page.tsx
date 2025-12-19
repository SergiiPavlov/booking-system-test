"use client";

import { Suspense } from "react";
import { api } from "@/lib/client/api";
import { emitAuthChanged } from "@/lib/client/auth-events";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

type SignInResponse = {
  user: { id: string; name: string; email: string; role: "CLIENT" | "BUSINESS" };
};

function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = useMemo(() => params.get("next") ?? "/businesses", [params]);

  const [email, setEmail] = useState("client1@example.com");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api<SignInResponse>("/api/auth/sign-in", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      emitAuthChanged();
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md text-gray-900">
        <h2 className="text-xl font-semibold text-gray-900">Sign in</h2>
        <p className="mt-1 text-sm text-gray-400">Use seeded credentials or your own account.</p>

        <form onSubmit={onSubmit} className="mt-6 grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-gray-700">Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-gray-600"
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-gray-700">Password</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-gray-600"
              placeholder="••••••••"
              required
            />
          </label>

          {error ? <p className="rounded-xl border border-red-900 bg-red-950/40 p-3 text-sm text-red-200">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-5 text-sm text-gray-400">
          No account?{" "}
          <a href="/sign-up" className="text-gray-200 underline underline-offset-4 hover:text-white">
            Create one
          </a>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-gray-800 bg-gray-900/30 p-4 text-xs text-gray-200">
        <div className="font-semibold text-gray-100">Seeded users</div>
        <ul className="mt-2 grid gap-1">
          <li>client1@example.com / Password123!</li>
          <li>client2@example.com / Password123!</li>
          <li>biz1@example.com / Password123!</li>
          <li>biz2@example.com / Password123!</li>
        </ul>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md p-6 text-sm text-gray-400">Loading sign-in form...</div>}>
      <SignInForm />
    </Suspense>
  );
}
