const express = require("express");

const {
    getReservation,
    getAllReservations,
} = require("../controllers/reservation.controller");

const router = express.Router();

/**
 * @swagger
 * /reservations:
 *   get:
 *     summary: Get all reservations
 *     tags: [Reservations]
 *     responses:
 *       200:
 *         description: Reservations fetched successfully
 *       500:
 *         description: Server error
 */
router.get("/", getAllReservations);

/**
 * @swagger
 * /reservations/{id}:
 *   get:
 *     summary: Get a reservation by ID
 *     tags: [Reservations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Reservation ID
 *     responses:
 *       200:
 *         description: Reservation fetched successfully
 *       400:
 *         description: Invalid reservation ID
 *       404:
 *         description: Reservation not found
 *       500:
 *         description: Server error
 */
router.get("/:id", getReservation);

module.exports = router;
