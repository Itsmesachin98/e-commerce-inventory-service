const mongoose = require("mongoose");

const Reservation = require("../models/reservation.model");

// GET /reservations
const getAllReservations = async (req, res) => {
    try {
        const reservations = await Reservation.find();

        return res.status(200).json({
            success: true,
            message: "Reservations fetched successfully",
            data: reservations,
        });
    } catch (error) {
        console.error("Error fetching reservations:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch reservations",
            error: error.message,
        });
    }
};

// GET /reservations/:id
const getReservation = async (req, res) => {
    const { id: reservationId } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(reservationId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid reservationId",
        });
    }

    try {
        const reservation = await Reservation.findById(reservationId).lean();

        // Not found
        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: "Reservation not found",
            });
        }

        // Success
        return res.status(200).json({
            success: true,
            message: "Reservation fetched successfully",
            data: reservation,
        });
    } catch (error) {
        console.error("Error fetching reservation:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch reservation",
            error: error.message,
        });
    }
};

module.exports = {
    getAllReservations,
    getReservation,
};
