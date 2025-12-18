# Booking System (Test Assignment) — Starter

This is the **starter ZIP** for the Booking System test assignment.

## Stack (chosen for a clean classic delivery in 3 days)
- Next.js (App Router) + TypeScript
- PostgreSQL (production: **Neon**; local: Docker Postgres)
- Prisma ORM
- Zod validation
- JWT in **httpOnly cookie** (implemented)

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

For Neon we recommend two URLs:
- `DATABASE_URL` (pooled; host contains `-pooler`) for app runtime
- `DIRECT_URL` (direct; host without `-pooler`) for Prisma migrations

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

## 1.1) Run in 3 minutes (copy/paste)

```bash
# 1) install
npm i

# 2) env (fill DATABASE_URL / DIRECT_URL / JWT_SECRET)
cp .env.example .env

# 3) DB schema + Prisma client
npm run prisma:migrate:dev

# 4) seed demo users
npm run seed

# 5) start
npm run dev
```

Then open:
- http://localhost:3000/businesses (CLIENT UI: browse businesses + book)
- http://localhost:3000/appointments (My appointments UI)

## 2) API smoke tests with curl (Git Bash)

Tip: in Git Bash use single quotes around JSON to avoid `!` history expansion issues.

### 2.1 Sign in as CLIENT

```bash
curl -i -c cookies.txt -X POST http://localhost:3000/api/auth/sign-in \
  -H 'Content-Type: application/json' \
  --data-raw '{"email":"client1@example.com","password":"Password123!"}'

curl -i -b cookies.txt http://localhost:3000/api/auth/me
```

List businesses:

```bash
curl -i -b cookies.txt "http://localhost:3000/api/users?role=BUSINESS"
```

Create appointment (replace BUSINESS_ID):

```bash
curl -i -b cookies.txt -X POST http://localhost:3000/api/appointments \
  -H 'Content-Type: application/json' \
  --data-raw '{"businessId":"BUSINESS_ID","startAt":"2026-02-01T10:00:00.000Z","durationMin":30}'
```

List my appointments:

```bash
curl -i -b cookies.txt http://localhost:3000/api/appointments/me
```

Cancel appointment (replace APPOINTMENT_ID):

```bash
curl -i -b cookies.txt -X POST \
  "http://localhost:3000/api/appointments/APPOINTMENT_ID/cancel"
```

Reschedule (only BOOKED):

```bash
curl -i -b cookies.txt -X PATCH \
  "http://localhost:3000/api/appointments/APPOINTMENT_ID" \
  -H 'Content-Type: application/json' \
  --data-raw '{"startAt":"2026-02-01T12:00:00.000Z","durationMin":45}'
```

### 2.2 Sign in as BUSINESS and cancel appointments for your business

```bash
curl -i -c bizcookies.txt -X POST http://localhost:3000/api/auth/sign-in \
  -H 'Content-Type: application/json' \
  --data-raw '{"email":"biz2@example.com","password":"Password123!"}'

curl -i -b bizcookies.txt http://localhost:3000/api/appointments/me

# pick an appointment id from the response and cancel it
curl -i -b bizcookies.txt -X POST \
  "http://localhost:3000/api/appointments/APPOINTMENT_ID/cancel"
```

## 3) Production deploy (DB + app)
1. Create a Neon database, copy `DATABASE_URL`
2. Deploy on Vercel
3. Set env vars in Vercel:
   - `DATABASE_URL`
   - `DIRECT_URL`
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
- `POST /api/appointments/:id/cancel` (CLIENT owner only OR BUSINESS owner)

### Notes / assumptions
- Time stored as UTC timestamps
- Overlap prevented per business for status=BOOKED (returns 409 CONFLICT)

## Day 2 (UI): pages
- `/sign-in` and `/sign-up`
- `/businesses` — list businesses + create appointment
- `/appointments` — my appointments + reschedule/cancel
