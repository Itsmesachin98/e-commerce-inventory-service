const mongoose = require("mongoose");

const Reservation = require("../models/reservation.model");
const {
    createReservationService,
    confirmReservationService,
    cancelReservationService,
} = require("../services/reservation.service");

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

// POST /reservations
// const createReservation = async (req, res) => {
//     try {
//         const { productId, qty } = req.body;

//         const quantity = Number(qty);
//         if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
//             return res.status(400).json({
//                 success: false,
//                 message: "productId and qty (positive integer) are required",
//             });
//         }

//         const data = await createReservationService({
//             productId,
//             quantity,
//             userId: req.user?._id || null,
//         });

//         return res.status(201).json({
//             success: true,
//             message: "Reservation created",
//             data,
//         });
//     } catch (error) {
//         if (error.message === "INSUFFICIENT_STOCK_OR_NOT_FOUND") {
//             return res.status(409).json({
//                 success: false,
//                 message: "Product not found or insufficient stock",
//             });
//         }

//         return res.status(500).json({ success: false, message: error.message });
//     }
// };

// POST /reservations/:id/confirm
// const confirmReservation = async (req, res) => {
//     try {
//         const { id: reservationId } = req.params;

//         if (!mongoose.Types.ObjectId.isValid(reservationId)) {
//             return res
//                 .status(400)
//                 .json({ success: false, message: "Invalid reservationId" });
//         }

//         const result = await confirmReservationService({ reservationId });

//         return res.status(200).json({
//             success: true,
//             message: result.alreadyConfirmed
//                 ? "Reservation already confirmed (idempotent)"
//                 : "Reservation confirmed",
//             data: { reservationId, status: result.status },
//         });
//     } catch (error) {
//         if (error.message === "RESERVATION_NOT_FOUND") {
//             return res
//                 .status(404)
//                 .json({ success: false, message: "Reservation not found" });
//         }

//         if (error.message === "RESERVATION_CANCELLED") {
//             return res
//                 .status(409)
//                 .json({ success: false, message: "Reservation is cancelled" });
//         }

//         if (error.message === "RESERVATION_EXPIRED") {
//             return res
//                 .status(409)
//                 .json({ success: false, message: "Reservation is expired" });
//         }

//         if (error.message === "RESERVATION_NOT_ACTIVE") {
//             return res
//                 .status(409)
//                 .json({ success: false, message: "Reservation is not active" });
//         }

//         return res.status(500).json({ success: false, message: error.message });
//     }
// };

// POST /reservations/:id/cancel
// const cancelReservation = async (req, res) => {
//     try {
//         const { id: reservationId } = req.params;

//         if (!mongoose.Types.ObjectId.isValid(reservationId)) {
//             return res
//                 .status(400)
//                 .json({ success: false, message: "Invalid reservationId" });
//         }

//         const result = await cancelReservationService({ reservationId });

//         return res.status(200).json({
//             success: true,
//             message: result.alreadyCancelled
//                 ? "Reservation already cancelled"
//                 : "Reservation cancelled",
//             data: { reservationId, status: result.status },
//         });
//     } catch (error) {
//         if (error.message === "RESERVATION_NOT_FOUND") {
//             return res
//                 .status(404)
//                 .json({ success: false, message: "Reservation not found" });
//         }

//         if (error.message === "RESERVATION_EXPIRED") {
//             return res
//                 .status(409)
//                 .json({ success: false, message: "Reservation is expired" });
//         }

//         if (error.message === "RESERVATION_CONFIRMED") {
//             return res
//                 .status(409)
//                 .json({ success: false, message: "Reservation is confirmed" });
//         }

//         if (error.message === "RESERVATION_NOT_ACTIVE") {
//             return res
//                 .status(409)
//                 .json({ success: false, message: "Reservation is not active" });
//         }

//         return res.status(500).json({ success: false, message: err.message });
//     }
// };

module.exports = {
    getAllReservations,
    getReservation,
    // createReservation,
    // confirmReservation,
    // cancelReservation,
};
