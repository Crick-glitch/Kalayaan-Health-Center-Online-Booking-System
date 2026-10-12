# Kalayaan Health Center API

Express + MongoDB backend.

## Run it
1. Install Node 20+ and have MongoDB running (local, or a MongoDB Atlas connection string).
2. `npm install`
3. Copy `.env.example` to `.env`, set `MONGO_URI` and a private random `JWT_SECRET`. For real email delivery, configure SMTP below; local development displays one-time codes in the UI when SMTP is not configured.
4. `npm run seed` fills the database (users, services, providers, schedules, 32 appointments, notifications).
5. `npm run dev` starts the API at http://localhost:8000

## Demo logins (password for all: Kalayaan#2026)
| Role | Email |
|---|---|
| Admin | paolo@kalayaan.example |
| Receptionist | joy@kalayaan.example |
| Doctor | elena@kalayaan.example |
| Patient | ana.reyes@email.com |

## Email setup
- **Email:** set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` for your SMTP provider.
- Registration verification and password recovery send one-time codes to the patient's email address. Codes expire after 10 minutes, allow five attempts, and can be resent once per minute.
- For local testing only, set `DEV_SHOW_AUTH_CODES=true` to display codes in the UI when a provider is not configured. This flag is ignored when `NODE_ENV=production`. Without configured delivery or the local flag, code requests return a delivery error. Never commit `.env` or use demo credentials with real patient data.

## Endpoints
- **Auth:** POST /api/auth/register, /verify-registration, /resend-verification, /login, /logout, /forgot-password, /reset-password; PATCH /api/auth/change-password; GET /api/auth/me; **PUT /api/auth/me** (edit own profile, every role)
- **Users (admin):** GET /api/users (role, status, search, archived, page), GET /api/users/:id, POST, PUT, PATCH /status, /role, /archive, /restore
- **Providers:** GET /api/providers and /:id are public; GET /:id/slots?serviceId=&date= (optional `appointmentId` for a reschedule, `walkIn=true` for the receptionist); POST, PATCH /archive, /restore are admin only; PUT /:id is admin (everything) or the doctor for their own title and bio
- **Services:** GET is public; POST, PUT, PATCH /archive, /restore are admin only
- **Schedules:** GET and PUT /api/schedules/:providerId (admin, or the doctor for their own)
- **Appointments:** GET, GET /:id, POST; PATCH /:id/status; POST /:id/reschedule-request; PUT /:id (body action: apply, reject or reschedule); PATCH /:id/archive and /restore
- **Notifications:** GET, PATCH /:id/read, PATCH /read-all, DELETE /:id (own only)
- **Patients (new):** GET /api/patients (search, status, page, limit; receptionist and admin see all active patients, a doctor only their own; each row has `visits` and `lastVisit`), POST and PUT /api/patients/:id (receptionist only). A patient added by staff has no password yet and sets one with Forgot password.
- **Archive:** GET /api/archive?type=user|provider|service|appointment&search=

## Rules the server enforces
- Roles on every route; patients see only their own appointments, doctors only their own patients.
- Archive is blocked with `HAS_DEPENDENCIES` and a `count` when upcoming appointments exist.
- Nobody can change their own role, status or archive state; the last active admin cannot be demoted, deactivated, suspended or archived.
- Changing a user to doctor creates an empty provider profile; changing away from doctor archives it.
- Archiving a provider also archives the linked doctor account (one Archive row, one restore).
- Publicly registered accounts must verify their email before login. Seeded and admin-created demonstration accounts are pre-verified.

## Run the API check
With the API running: `npm run smoke` (100+ checks: authentication, roles, booking rules, cutoff, lifecycle, reschedule, patients, archive, notifications, and a three-way race for one slot). It changes data, so run `npm run seed` again afterwards. Set `SKIP_INDEX_TEST=1` only if your database cannot create partial unique indexes.

## Notes
- The server runs on Asia/Manila time (UTC+8) by default, so "today", the 60-minute lead time and the 24-hour cutoff match the clinic. Set `TZ` in `.env` to change it.
- Password hashes are never sent to the client. Messages and timeline notes use readable dates ("October 12, 2026 at 2:30 PM"). Notifications are created on every status change (including No Show, In Consultation and a patient's own cancellation, which also notifies staff).
- Demo data reset is `npm run seed` (it erases the six collections). There is no reset button in the app.
- Passwords use `bcryptjs` (the same algorithm as bcrypt, no native build needed).
- The database refuses two active appointments in the same provider, date and start time (partial unique index).
- Every status change is checked on the server. The frontend buttons are only a convenience.
