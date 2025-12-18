import Link from "next/link";

export default function HomePage() {
  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-gray-800 bg-gray-900/30 p-5">
        <h1 className="text-xl font-semibold">Booking System</h1>
        <p className="mt-1 text-sm text-gray-400">
          Minimal, classic implementation of the test assignment: JWT auth (httpOnly cookie), businesses list, and appointment booking.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/sign-in"
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-gray-100"
          >
            Sign in
          </Link>
          <Link
            href="/businesses"
            className="rounded-xl border border-gray-700 bg-gray-950 px-4 py-2 text-sm font-semibold text-gray-100 hover:bg-gray-900"
          >
            Businesses
          </Link>
          <Link
            href="/appointments"
            className="rounded-xl border border-gray-700 bg-gray-950 px-4 py-2 text-sm font-semibold text-gray-100 hover:bg-gray-900"
          >
            My appointments
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-800 bg-gray-900/20 p-5">
        <h2 className="text-lg font-semibold">API quick checks</h2>
        <ul className="mt-3 grid gap-2 text-sm text-gray-300">
          <li>
            <code className="rounded bg-gray-950 px-2 py-0.5">GET /api/health</code>
          </li>
          <li>
            <code className="rounded bg-gray-950 px-2 py-0.5">POST /api/auth/sign-in</code> (sets <code className="rounded bg-gray-950 px-2 py-0.5">bs_token</code>)
          </li>
          <li>
            <code className="rounded bg-gray-950 px-2 py-0.5">GET /api/users?role=BUSINESS</code>
          </li>
          <li>
            <code className="rounded bg-gray-950 px-2 py-0.5">POST /api/appointments</code>
          </li>
        </ul>
      </section>
    </div>
  );
}
