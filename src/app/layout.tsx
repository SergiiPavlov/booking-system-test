import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import AuthStatus from "@/components/auth/AuthStatus";

export const metadata: Metadata = {
  title: "Booking System",
  description: "Test assignment starter"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-950 text-gray-100">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <header className="flex flex-col gap-3 rounded-2xl border border-gray-800 bg-gray-900/40 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-baseline gap-3">
              <Link href="/" className="text-lg font-semibold tracking-tight">
                Booking System
              </Link>
              {" "}
              <span className="text-sm text-gray-400">test assignment</span>
            </div>

            <nav className="flex flex-wrap items-center gap-2 text-sm">
              <Link href="/businesses" className="rounded-xl px-3 py-1.5 hover:bg-gray-800">
                Businesses
              </Link>
              <Link href="/appointments" className="rounded-xl px-3 py-1.5 hover:bg-gray-800">
                My appointments
              </Link>
              <div className="mx-1 h-4 w-px bg-gray-800" />
              <AuthStatus />
            </nav>
          </header>

          <main className="mt-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
