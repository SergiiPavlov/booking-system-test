"use client";

import { api } from "@/lib/client/api";
import { useRouter } from "next/navigation";
import { useState } from "react";

type SignUpResponse = {
  user: { id: string; name: string; email: string; role: "CLIENT" | "BUSINESS" };
};

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Password123!");
  const [role, setRole] = useState<"CLIENT" | "BUSINESS">("CLIENT");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api<SignUpResponse>("/api/auth/sign-up", {
        method: "POST",
        body: JSON.stringify({ name, email, password, role })
      });
      router.push("/businesses");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-up failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md text-gray-900">
        <h2 className="text-xl font-semibold text-gray-900">Sign up</h2>
        <p className="mt-1 text-sm text-gray-400">Create an account (CLIENT or BUSINESS).</p>

        <form onSubmit={onSubmit} className="mt-6 grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-gray-700">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-gray-600"
              placeholder="Your name"
              required
            />
          </label>

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
            <span className="text-xs text-gray-500">Tip: use Password123! while testing.</span>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-gray-700">Role</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "CLIENT" | "BUSINESS")}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none focus:ring-2 focus:ring-gray-600"
            >
              <option value="CLIENT">CLIENT</option>
              <option value="BUSINESS">BUSINESS</option>
            </select>
          </label>

          {error ? <p className="rounded-xl border border-red-900 bg-red-950/40 p-3 text-sm text-red-200">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Creating…" : "Create account"}
          </button>
        </form>

        <div className="mt-5 text-sm text-gray-400">
          Already have an account?{" "}
          <a href="/sign-in" className="text-gray-200 underline underline-offset-4 hover:text-white">
            Sign in
          </a>
        </div>
      </div>
    </div>
  );
}
