// server/index.js
require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const { bookingLimiter } = require("./middleware/rateLimiter");

const servicesRouter = require("./routes/services");
const barbersRouter = require("./routes/barbers");
const availabilityRouter = require("./routes/availability");
const bookingsRouter = require("./routes/bookings");
const leadsRouter = require("./routes/leads");
const adminRouter = require("./routes/admin");

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false, // keep simple for the static frontend; tighten if you add a CDN/CSP later
  })
);
app.use(cors());
app.use(express.json({ limit: "100kb" }));

// ---- API routes ----
app.use("/api/services", servicesRouter);
app.use("/api/barbers", barbersRouter);
app.use("/api/availability", availabilityRouter);
app.use("/api/bookings", bookingLimiter, bookingsRouter);
app.use("/api/leads", bookingLimiter, leadsRouter);
app.use("/api/admin", adminRouter);

app.get("/api/health", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// ---- Static frontend ----
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "admin.html"));
});

// Fallback to index.html for any other non-API route (simple SPA-style routing)
app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

// ---- Error handler ----
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on our end. Please call the shop directly." });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Colonia Barbershop server running at http://localhost:${PORT}`);
});
