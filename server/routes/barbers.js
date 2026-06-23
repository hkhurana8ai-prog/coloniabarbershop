// server/routes/barbers.js
const express = require("express");
const db = require("../db");

const router = express.Router();

router.get("/", (req, res) => {
  const barbers = db
    .prepare("SELECT * FROM barbers WHERE active = 1 ORDER BY sort_order ASC")
    .all();
  res.json(barbers);
});

module.exports = router;
