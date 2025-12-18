# Booking System (Day 2+)

This repo is a small demo booking system:
- Roles: **CLIENT** and **BUSINESS**
- Auth: email/password -> HttpOnly cookie `bs_token`
- Appointments: create / list / reschedule / cancel
- **Availability + Free slots (Day 3)**: BUSINESS defines working hours & breaks; CLIENT books from a list of free slots

## Quick start (3 minutes)

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

4) Run dev server

```bash
npm run dev
```

Open: http://localhost:3000

---

## Demo users

Seed creates:

- CLIENT: `client1@example.com` / `Password123!`
- BUSINESS: `biz2@example.com` / `Password123!`

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
- Server still enforces conflicts and will return **409** in case of a race (another appointment booked the slot).
