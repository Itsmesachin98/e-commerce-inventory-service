const mongoose = require("mongoose");

const { redisConnection } = require("../config/redis");
const Product = require("../models/product.model");
const Reservation = require("../models/reservation.model");
const reservationQueue = require("../queues/reservation.queue");

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
const createReservation = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        const { productId, qty } = req.body;

        if (!productId || !qty) {
            return res.status(400).json({
                success: false,
                message: "productId and qty are required",
            });
        }

        const quantity = Number(qty);
        if (!Number.isInteger(quantity) || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: "qty must be a positive integer",
            });
        }

        const reservationTTLMinutes = 5;
        const expiresAt = new Date(
            Date.now() + reservationTTLMinutes * 60 * 1000,
        );

        let createdReservation;

        await session.withTransaction(async () => {
            // Check product exists + atomic decrement stock
            const updatedProduct = await Product.findOneAndUpdate(
                {
                    _id: productId,
                    availableStock: { $gte: quantity }, // ✅ ensures no oversell
                },
                {
                    $inc: { availableStock: -quantity },
                },
                { new: true, session },
            );

            if (!updatedProduct) {
                throw new Error("INSUFFICIENT_STOCK_OR_NOT_FOUND");
            }

            // Create reservation in MongoDB
            createdReservation = await Reservation.create(
                [
                    {
                        productId,
                        quantity,
                        status: "ACTIVE",
                        expiresAt,
                        userId: req.user?._id || null, // optional
                    },
                ],
                { session },
            );
        });

        const reservation = createdReservation[0];

        // Set Redis TTL key (source of truth for expiry timer)
        const ttlSeconds = reservationTTLMinutes * 60;
        const redisKey = `reservation:${reservation._id.toString()}`;

        await redisConnection.set(redisKey, "ACTIVE", "EX", ttlSeconds);

        // Add delayed job for expiry cleanup (BullMQ)
        await reservationQueue.add(
            "expire-reservation",
            { reservationId: reservation._id.toString() },
            { delay: ttlSeconds * 1000 },
        );

        return res.status(201).json({
            success: true,
            message: "Reservation created successfully",
            data: {
                reservationId: reservation._id,
                expiresAt: reservation.expiresAt,
            },
        });
    } catch (error) {
        if (error.message === "INSUFFICIENT_STOCK_OR_NOT_FOUND") {
            return res.status(409).json({
                success: false,
                message: "Product not found or insufficient stock",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to create reservation",
            error: error.message,
        });
    } finally {
        session.endSession();
    }
};

// POST /reservations/:id/confirm
const confirmReservation = async (req, res) => {
    const { id: reservationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(reservationId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid reservationId",
        });
    }

    try {
        // Step 1: Find reservation
        const reservation = await Reservation.findById(reservationId);

        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: "Reservation not found",
            });
        }

        // Step 2: Idempotency check
        if (reservation.status === "CONFIRMED") {
            return res.status(200).json({
                success: true,
                message: "Reservation already confirmed (idempotent success)",
                data: {
                    reservationId: reservation._id,
                    status: reservation.status,
                },
            });
        }

        // Step 3: Block invalid confirmations
        if (reservation.status === "EXPIRED") {
            return res.status(409).json({
                success: false,
                message: "Reservation expired. Cannot confirm.",
            });
        }

        if (reservation.status === "CANCELLED") {
            return res.status(409).json({
                success: false,
                message: "Reservation cancelled. Cannot confirm.",
            });
        }

        // Step 4: Expiry safety check (important)
        // If time is already past, treat it as expired
        if (reservation.expiresAt <= new Date()) {
            // Mark it expired (best effort)
            reservation.status = "EXPIRED";
            await reservation.save();

            return res.status(409).json({
                success: false,
                message: "Reservation expired. Cannot confirm.",
            });
        }

        // Step 5: Confirm permanently
        reservation.status = "CONFIRMED";
        await reservation.save();

        // Step 6: Remove Redis TTL key so worker won't expire it
        const redisKey = `reservation:${reservation._id.toString()}`;
        await redisConnection.del(redisKey);

        return res.status(200).json({
            success: true,
            message: "Reservation confirmed successfully",
            data: {
                reservationId: reservation._id,
                status: reservation.status,
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to confirm reservation",
            error: error.message,
        });
    }
};

// POST /reservations/:id/cancel
const cancelReservation = async (req, res) => {
    const { id: reservationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(reservationId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid reservationId",
        });
    }

    const session = await mongoose.startSession();

    try {
        let alreadyCancelled = false;

        await session.withTransaction(async () => {
            // Lock reservation by fetching inside transaction
            const reservation =
                await Reservation.findById(reservationId).session(session);

            if (!reservation) throw new Error("RESERVATION_NOT_FOUND");

            // Idempotency: already cancelled
            if (reservation.status === "CANCELLED") {
                alreadyCancelled = true;
                return;
            }

            // Cannot cancel after confirm
            if (reservation.status === "CONFIRMED")
                throw new Error("RESERVATION_ALREADY_CONFIRMED");

            // Expired already restored stock
            if (reservation.status === "EXPIRED")
                throw new Error("RESERVATION_ALREADY_EXPIRED");

            // Must be ACTIVE to cancel + restore stock
            if (reservation.status !== "ACTIVE")
                throw new Error("RESERVATION_NOT_ACTIVE");

            // Restore stock instantly
            await Product.updateOne(
                { _id: reservation.productId },
                { $inc: { availableStock: reservation.quantity } },
                { session },
            );

            // Mark reservation cancelled
            reservation.status = "CANCELLED";
            await reservation.save({ session });
        });

        // Remove Redis TTL key so worker won't expire it later
        await redisConnection.del(`reservation:${reservationId}`);

        return res.status(200).json({
            success: true,
            message: alreadyCancelled
                ? "Reservation already cancelled (idempotent success)"
                : "Reservation cancelled successfully",
        });
    } catch (error) {
        if (error.message === "RESERVATION_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Reservation not found",
            });
        }

        if (error.message === "RESERVATION_ALREADY_CONFIRMED") {
            return res.status(409).json({
                success: false,
                message: "Reservation is already confirmed. Cannot cancel.",
            });
        }

        if (error.message === "RESERVATION_ALREADY_EXPIRED") {
            return res.status(409).json({
                success: false,
                message: "Reservation already expired. Cannot cancel.",
            });
        }

        if (error.message === "RESERVATION_NOT_ACTIVE") {
            return res.status(409).json({
                success: false,
                message: "Reservation is not ACTIVE. Cannot cancel.",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to cancel reservation",
            error: error.message,
        });
    } finally {
        session.endSession();
    }
};

module.exports = {
    getReservation,
    createReservation,
    confirmReservation,
    cancelReservation,
};
