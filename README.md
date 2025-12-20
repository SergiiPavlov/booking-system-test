# Booking System (Test task)

Small demo booking system built for a Full‑Stack test task.

What’s implemented:
- Users with roles: **CLIENT**, **BUSINESS**, **ADMIN**
- Auth: email/password → HttpOnly cookie `bs_token`
- Users management:
  - ADMIN can view the Users page and manage users via API
  - CLIENT/BUSINESS can access only their allowed data
- Appointments: create / list / reschedule / cancel
- Availability + Free slots: BUSINESS defines working hours & breaks; CLIENT books from a list of free slots

## Quick start (local, 3–5 minutes)

1) Install dependencies

```bash
npm i
```

2) Configure env

Create `.env` (or `.env.local`) with your Postgres connection:

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/booking_system?schema=public
DIRECT_URL=postgresql://user:pass@localhost:5432/booking_system?schema=public
JWT_SECRET=dev-secret-change-me
```

3) Apply migrations + seed

```bash
npx prisma migrate dev
npx prisma db seed
```

Note: for deployment environments (Render/Railway/Vercel) use `npx prisma migrate deploy` instead of `migrate dev`.

4) Run dev server

```bash
npm run dev
```

Open: http://localhost:3000

### Demo pages
- Sign in page: `/sign-in`
- Users page (ADMIN): `/users`
- Appointments page: `/appointments`

---

## Demo users

Seed creates:

- CLIENT: `client1@example.com` / `Password123!`
- CLIENT: `client2@example.com` / `Password123!`
- BUSINESS: `biz1@example.com` / `Password123!`
- BUSINESS: `biz2@example.com` / `Password123!`
- ADMIN: `admin@example.com` / `Admin123!`

If you re-run seed and admin login stops working, run:

```bash
node scripts/reset-admin.cjs
```

---

## Curl cookbook

### 1) Sign in (CLIENT)

```bash
curl -i -c cookies.txt -X POST http://localhost:3000/api/auth/sign-in \
  -H "Content-Type: application/json" \
  --data-raw '{"email":"client1@example.com","password":"Password123!"}'
```

### 2) List businesses

```bash
curl -i -b cookies.txt http://localhost:3000/api/businesses
```

### 3) Get free slots for a day

```bash
# example: get slots for 2026-02-01 (duration 30)
curl -i -b cookies.txt \
  "http://localhost:3000/api/availability/slots?businessId=<BUSINESS_ID>&from=2026-02-01T00:00:00.000Z&to=2026-02-02T00:00:00.000Z&durationMin=30"
```

### 4) Book a slot (CLIENT)

```bash
curl -i -b cookies.txt -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  --data-raw '{"businessId":"<BUSINESS_ID>","startAt":"2026-02-01T10:00:00.000Z","durationMin":30}'
```

### 5) Reschedule (CLIENT)

```bash
curl -i -b cookies.txt -X PATCH "http://localhost:3000/api/appointments/<APPOINTMENT_ID>" \
  -H "Content-Type: application/json" \
  --data-raw '{"startAt":"2026-02-01T11:00:00.000Z","durationMin":45}'
```

### 6) Cancel (CLIENT)

```bash
curl -i -b cookies.txt -X POST "http://localhost:3000/api/appointments/<APPOINTMENT_ID>/cancel"
```

---

## Availability (BUSINESS)

### Sign in (BUSINESS)

```bash
curl -i -c bizcookies.txt -X POST http://localhost:3000/api/auth/sign-in \
  -H "Content-Type: application/json" \
  --data-raw '{"email":"biz2@example.com","password":"Password123!"}'
```

### Get current availability

```bash
curl -i -b bizcookies.txt http://localhost:3000/api/availability/me
```

### Update availability

```bash
curl -i -b bizcookies.txt -X PUT http://localhost:3000/api/availability/me \
  -H "Content-Type: application/json" \
  --data-raw '{
    "slotStepMin": 15,
    "days": [
      {"dayOfWeek": 1, "start": "09:00", "end": "17:00", "breaks": [{"start": "13:00", "end": "14:00"}]},
      {"dayOfWeek": 2, "start": "09:00", "end": "17:00", "breaks": [{"start": "13:00", "end": "14:00"}]}
    ]
  }'
```

---

## Notes

- Slots are generated from BUSINESS working hours and breaks, and exclude already **BOOKED** appointments.
- Server enforces overlap checks and returns **409** for conflicts.

---

## Deploy (Render/Railway/Vercel)

This project is intended to be deployed. Minimal requirements for a successful deploy:

1) Set environment variables on the platform:
- `DATABASE_URL`
- `DIRECT_URL` (optional, depending on provider)
- `JWT_SECRET`

2) Build:

```bash
npm ci
npm run build
```

3) Apply migrations on the deployed database:

```bash
npx prisma migrate deploy
```

4) (Optional) Seed demo users:

```bash
npx prisma db seed
```

