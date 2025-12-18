import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Booking System",
  description: "Test assignment starter"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
          <header style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
            <h1 style={{ margin: 0, fontSize: 22 }}>Booking System</h1>
            <span style={{ opacity: 0.7 }}>starter</span>
          </header>
          <hr style={{ margin: "16px 0" }} />
          {children}
        </div>
      </body>
    </html>
  );
}
