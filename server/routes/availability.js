// server/routes/availability.js
const express = require("express");
const db = require("../db");
const { getAvailableSlots } = require("../utils/slots");
const { isValidDate } = require("../middleware/validate");

const router = express.Router();

router.get("/", (req, res) => {
  const { date, serviceId, barberId } = req.query;

  if (!isValidDate(date)) return res.status(400).json({ error: "date must be YYYY-MM-DD" });
  if (!serviceId) return res.status(400).json({ error: "serviceId is required" });

  const service = db.prepare("SELECT * FROM services WHERE id = ? AND active = 1").get(serviceId);
  if (!service) return res.status(404).json({ error: "Unknown service" });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (new Date(date + "T00:00:00") < today) {
    return res.json({ date, slots: [] });
  }

  const slots = getAvailableSlots({
    date,
    durationMinutes: service.duration_minutes,
    barberId: barberId ? Number(barberId) : null,
  });

  res.json({ date, slots });
});

module.exports = router;
