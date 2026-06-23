// server/utils/slots.js
const db = require("../db");

const SLOT_STEP_MINUTES = 15;

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function toHHMM(mins) {
  const h = Math.floor(mins / 60).toString().padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Returns an array of "HH:MM" strings that are bookable for the given date,
 * service duration, and (optional) specific barber.
 *
 * Logic: start from business hours for that weekday, subtract any shop-wide
 * or barber-specific time off, then walk the day in SLOT_STEP_MINUTES steps
 * and keep any slot where [slot, slot+duration) doesn't overlap an existing
 * booking. If barberId is null ("no preference"), a slot counts as available
 * as long as at least one active barber is free for it.
 */
function getAvailableSlots({ date, durationMinutes, barberId = null }) {
  const dow = new Date(date + "T00:00:00").getDay();
  const hoursRow = db.prepare("SELECT * FROM business_hours WHERE day_of_week = ?").get(dow);
  if (!hoursRow || !hoursRow.open_time || !hoursRow.close_time) return [];

  const allBarbers = barberId
    ? [db.prepare("SELECT * FROM barbers WHERE id = ? AND active = 1").get(barberId)].filter(Boolean)
    : db.prepare("SELECT * FROM barbers WHERE active = 1 ORDER BY sort_order").all();
  if (allBarbers.length === 0) return [];

  // Whole-shop closure for the date (holidays etc.)
  const shopClosed = db
    .prepare("SELECT 1 FROM time_off WHERE barber_id IS NULL AND date = ? AND start_time IS NULL")
    .get(date);
  if (shopClosed) return [];

  const openMin = toMinutes(hoursRow.open_time);
  const closeMin = toMinutes(hoursRow.close_time);

  const existingBookings = db
    .prepare(
      `SELECT barber_id, time, duration_minutes FROM bookings
       WHERE date = ? AND status NOT IN ('cancelled', 'no_show')`
    )
    .all(date);

  const timeOffRows = db
    .prepare(`SELECT barber_id, start_time, end_time FROM time_off WHERE date = ? AND barber_id IS NOT NULL`)
    .all(date);

  function isBarberFree(barber, slotStart, duration) {
    const slotEnd = slotStart + duration;

    for (const b of existingBookings) {
      if (b.barber_id !== null && b.barber_id !== barber.id) continue;
      // If the existing booking has no barber assigned ("no preference"),
      // conservatively block it against every barber's slot so we never
      // double-book when two "no preference" requests land on one person.
      const bStart = toMinutes(b.time);
      const bEnd = bStart + b.duration_minutes;
      if (slotStart < bEnd && bStart < slotEnd) return false;
    }
    for (const t of timeOffRows.filter((t) => t.barber_id === barber.id)) {
      const tStart = t.start_time ? toMinutes(t.start_time) : openMin;
      const tEnd = t.end_time ? toMinutes(t.end_time) : closeMin;
      if (slotStart < tEnd && tStart < slotEnd) return false;
    }
    return true;
  }

  const slots = [];
  for (let t = openMin; t + durationMinutes <= closeMin; t += SLOT_STEP_MINUTES) {
    const someoneFree = allBarbers.some((b) => isBarberFree(b, t, durationMinutes));
    if (someoneFree) slots.push(toHHMM(t));
  }
  return slots;
}

module.exports = { getAvailableSlots, toMinutes, toHHMM };
