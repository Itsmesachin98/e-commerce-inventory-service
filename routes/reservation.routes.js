const express = require("express");

const createReservation = require("../controllers/reservation.controller");

const router = express.Router();

router.post("/reservations", createReservation);

module.exports = router;
