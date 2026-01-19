const express = require("express");

const {
    createReservation,
    confirmReservation,
} = require("../controllers/reservation.controller");

const router = express.Router();

router.post("/reservations", createReservation);
router.post("/reservations/:id/confirm", confirmReservation);

module.exports = router;
