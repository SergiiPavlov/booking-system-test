export default function HomePage() {
  return (
    <main style={{ display: "grid", gap: 12 }}>
      <p>
        API is ready (Day 1). Next step: build UI pages for users, businesses and appointments.
      </p>

      <h2 style={{ margin: "12px 0 0" }}>Quick checks</h2>
      <ul style={{ display: "grid", gap: 6, paddingLeft: 18 }}>
        <li>
          <code>/api/health</code> — health check
        </li>
        <li>
          <code>POST /api/auth/sign-in</code> — sign-in (sets <code>bs_token</code> cookie)
        </li>
        <li>
          <code>GET /api/users?role=BUSINESS</code> — list businesses (requires auth cookie)
        </li>
        <li>
          Prisma schema: <code>prisma/schema.prisma</code>
        </li>
      </ul>
    </main>
  );
}
