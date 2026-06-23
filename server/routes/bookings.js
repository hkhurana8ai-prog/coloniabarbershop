// server/routes/bookings.js
const express = require("express");
const crypto = require("crypto");
const db = require("../db");
const { getAvailableSlots, toMinutes } = require("../utils/slots");
const { notifyNewBooking } = require("../utils/notify");
const { googleCalendarLink, icsFile } = require("../utils/calendar");
const {
  isNonEmptyString,
  isValidDate,
  isValidTime,
  isValidPhone,
  isValidEmail,
} = require("../middleware/validate");

const router = express.Router();

function generateConfirmationCode() {
  return crypto.randomBytes(3).toString("hex").toUpperCase(); // e.g. "4F2A9C"
}

// POST /api/bookings — create a new booking. This is the main conversion event.
router.post("/", async (req, res) => {
  const {
    customer_name,
    customer_phone,
    customer_email,
    service_id,
    barber_id, // optional, null/undefined = no preference
    date,
    time,
    notes,
    honeypot, // hidden field — real users never fill this in
  } = req.body || {};

  if (honeypot) return res.status(200).json({ ok: true }); // silently drop bots

  if (!isNonEmptyString(customer_name, 100)) return res.status(400).json({ error: "Name is required" });
  if (!isValidPhone(customer_phone)) return res.status(400).json({ error: "Valid phone number is required" });
  if (customer_email && !isValidEmail(customer_email)) return res.status(400).json({ error: "Email looks invalid" });
  if (!service_id) return res.status(400).json({ error: "Service is required" });
  if (!isValidDate(date)) return res.status(400).json({ error: "Date is invalid" });
  if (!isValidTime(time)) return res.status(400).json({ error: "Time is invalid" });

  const service = db.prepare("SELECT * FROM services WHERE id = ? AND active = 1").get(service_id);
  if (!service) return res.status(404).json({ error: "Unknown service" });

  let barber = null;
  if (barber_id) {
    barber = db.prepare("SELECT * FROM barbers WHERE id = ? AND active = 1").get(barber_id);
    if (!barber) return res.status(404).json({ error: "Unknown barber" });
  }

  // Re-check availability right before writing, to avoid a race between two
  // people booking the same slot at nearly the same time.
  const stillOpen = getAvailableSlots({
    date,
    durationMinutes: service.duration_minutes,
    barberId: barber_id ? Number(barber_id) : null,
  }).includes(time);

  if (!stillOpen) {
    return res.status(409).json({ error: "That time was just taken. Please pick another slot." });
  }

  const confirmation_code = generateConfirmationCode();

  const insert = db.prepare(`
    INSERT INTO bookings
      (confirmation_code, customer_name, customer_phone, customer_email, service_id, barber_id, date, time, duration_minutes, notes, status, source)
    VALUES
      (@confirmation_code, @customer_name, @customer_phone, @customer_email, @service_id, @barber_id, @date, @time, @duration_minutes, @notes, 'pending', 'website')
  `);

  const result = insert.run({
    confirmation_code,
    customer_name: customer_name.trim(),
    customer_phone: customer_phone.trim(),
    customer_email: customer_email ? customer_email.trim() : null,
    service_id: service.id,
    barber_id: barber ? barber.id : null,
    date,
    time,
    duration_minutes: service.duration_minutes,
    notes: notes ? String(notes).slice(0, 1000) : null,
  });

  const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(result.lastInsertRowid);

  // Fire-and-forget email notifications — never block the response on email.
  notifyNewBooking(booking, service, barber).catch(() => {});

  const siteUrl = process.env.SITE_URL || "";
  const location = "498 Inman Ave Ste 6, Colonia, NJ 07067";
  const title = `${service.name} at Colonia Barbershop`;
  const details = `Barber: ${barber ? barber.name : "First available"}\nConfirmation code: ${confirmation_code}`;

  res.status(201).json({
    booking: {
      id: booking.id,
      confirmation_code: booking.confirmation_code,
      date: booking.date,
      time: booking.time,
      service: service.name,
      barber: barber ? barber.name : "First available",
      status: booking.status,
    },
    addToCalendarUrl: googleCalendarLink({
      title,
      date: booking.date,
      time: booking.time,
      durationMinutes: booking.duration_minutes,
      details,
      location,
    }),
    icsDownloadUrl: `${siteUrl}/api/bookings/${booking.id}/calendar.ics`,
  });
});

// GET /api/bookings/:id/calendar.ics — downloadable calendar file for a booking
router.get("/:id/calendar.ics", (req, res) => {
  const booking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(req.params.id);
  if (!booking) return res.status(404).send("Not found");

  const service = db.prepare("SELECT * FROM services WHERE id = ?").get(booking.service_id);
  const barber = booking.barber_id ? db.prepare("SELECT * FROM barbers WHERE id = ?").get(booking.barber_id) : null;

  const ics = icsFile({
    title: `${service.name} at Colonia Barbershop`,
    date: booking.date,
    time: booking.time,
    durationMinutes: booking.duration_minutes,
    details: `Barber: ${barber ? barber.name : "First available"}\nConfirmation code: ${booking.confirmation_code}`,
    location: "498 Inman Ave Ste 6, Colonia, NJ 07067",
    uid: booking.id,
  });

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="appointment.ics"`);
  res.send(ics);
});

// GET /api/bookings/lookup?code=ABC123&phone=555... — let a customer check their own booking
router.get("/lookup", (req, res) => {
  const { code, phone } = req.query;
  if (!code || !phone) return res.status(400).json({ error: "code and phone are required" });

  const booking = db
    .prepare("SELECT * FROM bookings WHERE confirmation_code = ? AND customer_phone = ?")
    .get(String(code).toUpperCase(), phone);

  if (!booking) return res.status(404).json({ error: "No matching booking found" });

  const service = db.prepare("SELECT * FROM services WHERE id = ?").get(booking.service_id);
  const barber = booking.barber_id ? db.prepare("SELECT * FROM barbers WHERE id = ?").get(booking.barber_id) : null;

  res.json({
    confirmation_code: booking.confirmation_code,
    date: booking.date,
    time: booking.time,
    status: booking.status,
    service: service.name,
    barber: barber ? barber.name : "First available",
  });
});

module.exports = router;
