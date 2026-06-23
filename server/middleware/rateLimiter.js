// server/middleware/rateLimiter.js
const rateLimit = require("express-rate-limit");

// Generous for real customers, tight enough to slow down scripted spam.
const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please call the shop directly if this keeps happening." },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again later." },
});

module.exports = { bookingLimiter, loginLimiter };
