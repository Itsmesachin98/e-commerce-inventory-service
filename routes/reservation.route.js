const express = require("express");

const {
    getReservation,
    getAllReservations,
} = require("../controllers/reservation.controller");

const router = express.Router();

router.get("/", getAllReservations);
router.get("/:id", getReservation);

module.exports = router;
