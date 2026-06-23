// server/routes/services.js
const express = require("express");
const db = require("../db");

const router = express.Router();

router.get("/", (req, res) => {
  const services = db
    .prepare("SELECT * FROM services WHERE active = 1 ORDER BY sort_order ASC")
    .all();
  res.json(services);
});

module.exports = router;
