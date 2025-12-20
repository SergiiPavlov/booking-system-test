import type { Metadata } from "next";
import "./globals.css";
import AuthStatus from "@/components/auth/AuthStatus";
import { NavLinks } from "@/components/auth/NavLinks";

export const metadata: Metadata = {
  title: "Booking System",
  description: "Booking system demo"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <header className="border-b bg-white">
          <div className="mx-auto flex max-w-4xl flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <NavLinks />
            <AuthStatus />
          </div>
        </header>
        <main className="mx-auto max-w-4xl p-4">{children}</main>
      </body>
    </html>
  );
}
