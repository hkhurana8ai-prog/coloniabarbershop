// server/utils/calendar.js

function pad(n) {
  return String(n).padStart(2, "0");
}

// date: "2026-06-25", time: "14:30" (local shop time, treated as US/Eastern in copy
// but stored as naive local time — fine for a single-location shop).
function toICSDate(date, time, durationMinutes) {
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  const start = new Date(y, m - 1, d, h, min);
  const end = new Date(start.getTime() + durationMinutes * 60000);

  const fmt = (dt) =>
    `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;

  return { startStr: fmt(start), endStr: fmt(end) };
}

function googleCalendarLink({ title, date, time, durationMinutes, details, location }) {
  const { startStr, endStr } = toICSDate(date, time, durationMinutes);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${startStr}/${endStr}`,
    details: details || "",
    location: location || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function icsFile({ title, date, time, durationMinutes, details, location, uid }) {
  const { startStr, endStr } = toICSDate(date, time, durationMinutes);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Colonia Barbershop//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${uid}@coloniabarbershop`,
    `DTSTAMP:${startStr}`,
    `DTSTART:${startStr}`,
    `DTEND:${endStr}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${(details || "").replace(/\n/g, "\\n")}`,
    `LOCATION:${location || ""}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

module.exports = { googleCalendarLink, icsFile };
