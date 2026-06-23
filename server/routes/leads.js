// server/routes/leads.js
const express = require("express");
const db = require("../db");
const { sendMail } = require("../utils/notify");
const { isNonEmptyString, isValidPhone, isValidEmail } = require("../middleware/validate");

const router = express.Router();

// POST /api/leads — "Request a callback" / general inquiry form.
// Separate from bookings so the shop can see, at a glance, who wants to come
// in but hasn't committed to a time yet.
router.post("/", async (req, res) => {
  const { name, phone, email, message, honeypot } = req.body || {};
  if (honeypot) return res.status(200).json({ ok: true });

  if (!isNonEmptyString(name, 100)) return res.status(400).json({ error: "Name is required" });
  if (!phone && !email) return res.status(400).json({ error: "Phone or email is required" });
  if (phone && !isValidPhone(phone)) return res.status(400).json({ error: "Phone number looks invalid" });
  if (email && !isValidEmail(email)) return res.status(400).json({ error: "Email looks invalid" });

  const result = db
    .prepare(`INSERT INTO leads (name, phone, email, message) VALUES (?, ?, ?, ?)`)
    .run(name.trim(), phone ? phone.trim() : null, email ? email.trim() : null, message ? String(message).slice(0, 1000) : null);

  sendMail({
    to: process.env.NOTIFY_EMAIL_TO,
    subject: `New website lead: ${name}`,
    text: `${name}\nPhone: ${phone || "—"}\nEmail: ${email || "—"}\nMessage: ${message || "—"}`,
  }).catch(() => {});

  res.status(201).json({ ok: true, id: result.lastInsertRowid });
});

module.exports = router;
