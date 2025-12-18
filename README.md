# Booking System (Test Assignment) — Starter

This is the **starter ZIP** for the Booking System test assignment.

## Stack (chosen for a clean classic delivery in 3 days)
- Next.js (App Router) + TypeScript
- PostgreSQL (production: **Neon**; local: Docker Postgres)
- Prisma ORM
- Zod validation
- JWT in **httpOnly cookie** (to be implemented next)

## Why Neon for DB deploy
Neon is a serverless Postgres that works well with Vercel and gives you a clean `DATABASE_URL`.
For local development we use Docker Postgres (optional).

## 1) Local run (recommended)
### Requirements
- Node.js 18+ (better 20+)
- npm/pnpm (your choice)
- Docker (optional, for local Postgres)

### Install
```bash
npm i
# or: pnpm i
```

### Environment
Copy and fill env:
```bash
cp .env.example .env
```

### Start local Postgres (optional)
```bash
docker compose up -d
```

### Prisma (first time)
```bash
npm run prisma:generate
npm run prisma:migrate:dev
npm run seed
```

### Run dev server
```bash
npm run dev
```

Open: http://localhost:3000

## 2) Production deploy (DB + app)
1. Create a Neon database, copy `DATABASE_URL`
2. Deploy on Vercel
3. Set env vars in Vercel:
   - `DATABASE_URL`
   - `JWT_SECRET`

## Assumptions we will document in README (next)
- Time stored in UTC (timestamp)
- No overlap allowed for the same business when status=BOOKED
- durationMin allowed range: 15..240

---


## Day 1 (implemented): API v0
### Auth
- `POST /api/auth/sign-up` { name, email, password, role }
- `POST /api/auth/sign-in` { email, password } -> sets httpOnly cookie `bs_token`
- `POST /api/auth/sign-out`
- `GET /api/auth/me`

### Users (requires auth)
- `GET /api/users?role=BUSINESS`
- `POST /api/users`
- `GET /api/users/:id`
- `PATCH /api/users/:id`
- `DELETE /api/users/:id`

### Appointments (requires auth)
- `POST /api/appointments` (CLIENT only)
- `GET /api/appointments/me`
- `PATCH /api/appointments/:id` (CLIENT owner only)
- `POST /api/appointments/:id/cancel` (CLIENT owner only)

### Notes / assumptions
- Time stored as UTC timestamps
- Overlap prevented per business for status=BOOKED (returns 409 CONFLICT)
