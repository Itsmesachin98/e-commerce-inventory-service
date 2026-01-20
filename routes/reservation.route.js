const express = require("express");

const {
    createReservation,
    confirmReservation,
    cancelReservation,
} = require("../controllers/reservation.controller");

const router = express.Router();

router.post("/reservations", createReservation);
router.post("/reservations/:id/confirm", confirmReservation);
router.post("/reservations/:id/cancel", cancelReservation);

module.exports = router;
