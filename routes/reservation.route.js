const express = require("express");

const {
    createReservation,
    confirmReservation,
    cancelReservation,
    getReservation,
} = require("../controllers/reservation.controller");

const router = express.Router();

router.get("/:id", getReservation);

router.post("/", createReservation);
router.post("/:id/confirm", confirmReservation);
router.post("/:id/cancel", cancelReservation);

module.exports = router;
