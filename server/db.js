// server/db.js
// Single SQLite file database. Good for one shop / low-to-medium traffic.
// To scale to multiple locations or high write volume, swap this file for a
// Postgres client (e.g. `pg` or Prisma) — every other file talks to `db`
// through the methods below, so that's the only file that has to change.

const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const DATA_DIR = path.join(__dirname, "..", "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "barbershop.sqlite"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  price_cents INTEGER NOT NULL DEFAULT 0,
  is_featured INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS barbers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  title TEXT,
  bio TEXT,
  photo_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS business_hours (
  day_of_week INTEGER PRIMARY KEY, -- 0 = Sunday ... 6 = Saturday
  open_time TEXT,                  -- "08:30" or NULL if closed
  close_time TEXT                  -- "20:00" or NULL if closed
);

CREATE TABLE IF NOT EXISTS time_off (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  barber_id INTEGER REFERENCES barbers(id) ON DELETE CASCADE, -- NULL = whole shop closed
  date TEXT NOT NULL,         -- "2026-07-04"
  start_time TEXT,            -- NULL = all day
  end_time TEXT,
  reason TEXT
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  confirmation_code TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  service_id INTEGER NOT NULL REFERENCES services(id),
  barber_id INTEGER REFERENCES barbers(id), -- NULL = "no preference"
  date TEXT NOT NULL,        -- "2026-06-25"
  time TEXT NOT NULL,        -- "14:30"
  duration_minutes INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | confirmed | completed | cancelled | no_show
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'website',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new', -- new | contacted | converted | closed
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_barber_date ON bookings(barber_id, date);
`);

module.exports = db;
