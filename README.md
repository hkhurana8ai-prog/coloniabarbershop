# Colonia Barbershop — website + booking backend

A complete booking website for Colonia Barbershop (498 Inman Ave Ste 6, Colonia, NJ):

- **Frontend** (`public/`) — a conversion-focused marketing page with a built-in
  3-step booking widget, plus an admin dashboard.
- **Backend** (`server/`) — a Node/Express + SQLite API that stores real
  bookings and leads, computes live availability, emails notifications, and
  protects an admin dashboard with a login.

The frontend also works as a **static preview** with no backend running — if
it can't reach the API, the booking widget falls back to demo data and
clearly labels itself as demo mode. Once you run the real server, it
automatically switches to live data with no code changes needed.

## What's real here vs. what you need to edit

This is a working, deployable codebase — not a mockup. Before going live:

1. **Prices and durations are placeholders.** Edit `server/seed.js` with your
   actual prices and service times, then re-run `npm run seed`.
2. **Hours** were pulled from public listings and may not be exactly right —
   double check `server/seed.js` (`hours` array) and `public/index.html`
   (the hours table) against what's posted on your door.
3. **Barber bios** for Jose and Imad are short placeholders — replace with
   real photos/bios in `server/seed.js` and `public/index.html`.
4. Swap `https://example.com` (in `index.html`'s `<meta>`/JSON-LD tags) for
   your real domain once you have one.

## Quick start (local)

Requires [Node.js](https://nodejs.org) 18+.

```bash
cd colonia-barbershop
npm install
cp .env.example .env
npm run make-admin-hash      # set an admin password, paste the printed hash into .env
npm run seed                 # creates data/barbershop.sqlite and loads services/barbers/hours
npm run dev                  # starts the server with auto-reload
```

Open `http://localhost:4000` for the site, `http://localhost:4000/admin` for
the dashboard.

If you just want to preview the design without installing anything, you can
open `public/index.html` directly in a browser — it'll run in demo mode.

## How the booking flow works

1. Customer picks a service → date/time → enters their info, on the
   homepage booking widget. There's no "pick a barber" step — the shop has
   more than two barbers, so the widget just matches whoever's free; a
   `barber_id` column still exists if you ever want to bring that back for
   a specific employee's hours or a customer favorite.
2. `GET /api/availability` computes open slots from `business_hours` minus
   any existing bookings/time off for that day, in 15-minute increments.
3. `POST /api/bookings` re-checks the slot is still open (in case two people
   booked at once), saves the booking, emails the shop and the customer (if
   SMTP is configured), and returns a confirmation code + "add to calendar"
   link.
4. Everything is visible and manageable from `/admin`: today's bookings,
   upcoming bookings, and a separate **leads** list for the "request a
   callback" form (people who weren't ready to pick a time).

## Is there a separate "owner version" of the app?

Yes — `/admin` is exactly that. Same codebase, different page, behind its
own login (set one up with `npm run make-admin-hash`). Two tabs:

- **Bookings** — every appointment from the website, filterable by date and
  status, with a status dropdown per row (pending → confirmed → completed,
  or cancelled/no-show).
- **Leads** — everyone who filled out "Not ready to book a time?" on the
  homepage: name, phone, email, message, when they submitted it. This is
  the log for "where do those phone numbers go?" — they live here, and
  nowhere else, unless you've also turned on SMTP email notifications.

## How phone bookings and website bookings don't collide

Everything lives in one `bookings` table no matter where it came from. The
website's widget writes to it directly. For a phone call or walk-in, click
**"+ New booking"** in `/admin` and log it the same way — that's what
actually prevents the double-booking scenario (someone online grabbing 4 PM
right after you've taken it by phone), because the moment you save that
admin entry, it's the same row the website's availability check reads.

A few details on how the check works:

- The shop has N "chairs" (however many barbers are marked active in
  `server/seed.js`). A slot stays bookable online as long as fewer than N
  appointments overlap it — with 6 barbers, six different 4 PM bookings can
  coexist, but a 7th gets turned away.
- Assign a *specific* barber to a phone booking (the "Barber" dropdown in
  the new-booking modal) and that exact person becomes unavailable for that
  slot everywhere, while the other chairs stay open.
- Right before any booking is saved — website or admin — the server
  re-checks availability one more time, which is what stops two people
  grabbing the exact same last-open slot within the same second.
- If you ever need to double-book on purpose, the admin modal will flag the
  conflict and offer a **"Book anyway"** override. The public website never
  offers that override — customers can only take a slot that's genuinely
  open.

## Email notifications (optional)

Bookings save to the database whether or not email is configured. To also
get an email per booking, fill in `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` in
`.env`. Any SMTP provider works — a Gmail account with an
[App Password](https://support.google.com/accounts/answer/185833), or a
transactional provider like Postmark/SendGrid/Resend's SMTP endpoint.

## Project structure

```
server/
  index.js          Express app + static file serving
  db.js             SQLite schema (services, barbers, hours, bookings, leads)
  seed.js           Real starting data — EDIT THIS with your real prices/hours
  auth.js           Admin JWT issuing/verification
  routes/           One file per API resource
  utils/slots.js    Availability calculation
  utils/notify.js   Email sending
  utils/calendar.js Google Calendar link + .ics file generation
public/
  index.html        Marketing page + booking widget
  admin.html         /admin dashboard
  css/, js/         Styles and vanilla-JS frontend logic (no build step)
```

## Deploying

This app is one Node process that serves both the API and the static
frontend, so the simplest path is any host that runs a persistent Node
server (not a pure serverless/static host):

### Option A — Render.com (recommended, free tier available)
1. Push this folder to a GitHub repo.
2. On [render.com](https://render.com): **New → Web Service** → connect the repo.
3. Build command: `npm install`. Start command: `npm run seed && npm start`
   (the seed step only overwrites services/barbers/hours, never bookings —
   safe to leave in, or remove after the first deploy).
4. Add the same variables from `.env.example` under **Environment**.
5. Add a **persistent disk** mounted at `/opt/render/project/src/data` so
   `data/barbershop.sqlite` survives deploys.

### Option B — Railway / Fly.io
Same idea: one Node web service, env vars from `.env.example`, and a
persistent volume for the `data/` folder.

### Option C — Your own VPS
```bash
git clone <your-repo>
cd colonia-barbershop
npm install --omit=dev
cp .env.example .env   # fill in real values
npm run make-admin-hash
npm run seed
npm start               # or run under pm2 / systemd
```
Put it behind Nginx or Caddy for HTTPS and your domain.

### Custom domain + Google
Once it's live on a real domain:
- Point your domain's DNS to the host.
- Add the site to **Google Business Profile** → "Booking" / website link so
  the Book Now button shows directly in Google Search and Maps.
- Update the JSON-LD block in `index.html` (`og:url`, `canonical`, image) to
  match the live domain.

## Scaling notes

SQLite (via `better-sqlite3`) is plenty for a single shop. If you ever add
more locations or need concurrent high write volume, swap `server/db.js` for
a Postgres connection (e.g. Supabase, Neon, or Render's managed Postgres) —
every route talks to `db` through plain SQL in that one file, so it's the
only thing that needs to change.

## Security notes already built in

- Helmet for standard HTTP security headers.
- Rate limiting on booking/lead/login endpoints.
- Server-side re-validation of availability before saving (no double-booked
  slots from a race condition).
- Honeypot field on public forms to quietly drop simple bots.
- Admin routes require a JWT issued only after a correct bcrypt-checked
  password.
- Inputs are validated server-side (not just trusted from the browser).
