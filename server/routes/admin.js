// server/routes/admin.js
const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const { signAdminToken, requireAdmin } = require("../auth");
const { loginLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

// POST /api/admin/login
router.post("/login", loginLimiter, (req, res) => {
  const { username, password } = req.body || {};
  const validUser = username === process.env.ADMIN_USERNAME;
  const validPass =
    process.env.ADMIN_PASSWORD_HASH && password
      ? bcrypt.compareSync(password, process.env.ADMIN_PASSWORD_HASH)
      : false;

  if (!validUser || !validPass) return res.status(401).json({ error: "Invalid username or password" });

  res.json({ token: signAdminToken() });
});

router.use(requireAdmin);

// GET /api/admin/overview — quick stats for the dashboard header
router.get("/overview", (req, res) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  const todayCount = db
    .prepare("SELECT COUNT(*) c FROM bookings WHERE date = ? AND status NOT IN ('cancelled')")
    .get(todayStr).c;
  const upcomingCount = db
    .prepare("SELECT COUNT(*) c FROM bookings WHERE date >= ? AND status NOT IN ('cancelled','completed','no_show')")
    .get(todayStr).c;
  const newLeads = db.prepare("SELECT COUNT(*) c FROM leads WHERE status = 'new'").get().c;
  const last7DaysBookings = db
    .prepare("SELECT COUNT(*) c FROM bookings WHERE date >= ? AND status NOT IN ('cancelled')")
    .get(weekAgo).c;

  res.json({ todayCount, upcomingCount, newLeads, last7DaysBookings });
});

// GET /api/admin/bookings?date=&status=
router.get("/bookings", (req, res) => {
  const { date, status } = req.query;
  let sql = `
    SELECT b.*, s.name AS service_name, br.name AS barber_name
    FROM bookings b
    JOIN services s ON s.id = b.service_id
    LEFT JOIN barbers br ON br.id = b.barber_id
    WHERE 1=1
  `;
  const params = [];
  if (date) {
    sql += " AND b.date = ?";
    params.push(date);
  }
  if (status) {
    sql += " AND b.status = ?";
    params.push(status);
  }
  sql += " ORDER BY b.date ASC, b.time ASC";

  res.json(db.prepare(sql).all(...params));
});

// PATCH /api/admin/bookings/:id  { status }
router.patch("/bookings/:id", (req, res) => {
  const { status } = req.body || {};
  const allowed = ["pending", "confirmed", "completed", "cancelled", "no_show"];
  if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid status" });

  const result = db.prepare("UPDATE bookings SET status = ? WHERE id = ?").run(status, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Booking not found" });
  res.json({ ok: true });
});

// GET /api/admin/leads
router.get("/leads", (req, res) => {
  res.json(db.prepare("SELECT * FROM leads ORDER BY created_at DESC").all());
});

// PATCH /api/admin/leads/:id  { status }
router.patch("/leads/:id", (req, res) => {
  const { status } = req.body || {};
  const allowed = ["new", "contacted", "converted", "closed"];
  if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid status" });

  const result = db.prepare("UPDATE leads SET status = ? WHERE id = ?").run(status, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Lead not found" });
  res.json({ ok: true });
});

module.exports = router;
