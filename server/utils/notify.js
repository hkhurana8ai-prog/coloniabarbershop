// server/utils/notify.js
const nodemailer = require("nodemailer");

let transporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function sendMail({ to, subject, text, html }) {
  if (!transporter || !to) return { sent: false, reason: "SMTP not configured" };
  try {
    await transporter.sendMail({
      from: process.env.NOTIFY_EMAIL_FROM || "Colonia Barbershop <bookings@example.com>",
      to,
      subject,
      text,
      html,
    });
    return { sent: true };
  } catch (err) {
    console.error("Email send failed:", err.message);
    return { sent: false, reason: err.message };
  }
}

async function notifyNewBooking(booking, service, barber) {
  const when = `${booking.date} at ${booking.time}`;
  const barberName = barber ? barber.name : "first available barber";

  // To the shop
  await sendMail({
    to: process.env.NOTIFY_EMAIL_TO,
    subject: `New booking: ${booking.customer_name} — ${service.name} (${when})`,
    text: `${booking.customer_name} (${booking.customer_phone}) booked ${service.name} with ${barberName} on ${when}.\nConfirmation code: ${booking.confirmation_code}\nNotes: ${booking.notes || "—"}`,
  });

  // To the customer (only if they gave an email)
  if (booking.customer_email) {
    await sendMail({
      to: booking.customer_email,
      subject: `You're booked at Colonia Barbershop — ${when}`,
      text: `Hi ${booking.customer_name},\n\nYou're booked for a ${service.name} with ${barberName} on ${when}.\nConfirmation code: ${booking.confirmation_code}\n\n498 Inman Ave Ste 6, Colonia, NJ 07067\n(848) 235-5919\n\nNeed to change anything? Just call the shop with your confirmation code.`,
    });
  }
}

module.exports = { sendMail, notifyNewBooking };
