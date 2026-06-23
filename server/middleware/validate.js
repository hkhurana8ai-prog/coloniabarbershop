// server/middleware/validate.js

function isNonEmptyString(v, maxLen = 500) {
  return typeof v === "string" && v.trim().length > 0 && v.trim().length <= maxLen;
}

function isValidDate(v) {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(v).getTime());
}

function isValidTime(v) {
  return typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}

function isValidPhone(v) {
  return typeof v === "string" && v.replace(/\D/g, "").length >= 7;
}

function isValidEmail(v) {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

module.exports = { isNonEmptyString, isValidDate, isValidTime, isValidPhone, isValidEmail };
