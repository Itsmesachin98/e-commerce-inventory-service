const mongoose = require("mongoose");

const Product = require("../models/product.model");
const Reservation = require("../models/reservation.model");
const { redisConnection } = require("../config/redis");
const reservationQueue = require("../queues/reservation.queue");

const TTL_MINUTES = 5;

// Create Reservation Service
const createReservationService = async ({
    productId,
    quantity,
    userId = null,
    session,
}) => {
    const ttlSeconds = TTL_MINUTES * 60;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    // ✅ Atomic stock deduction inside same session
    const product = await Product.findOneAndUpdate(
        { _id: productId, availableStock: { $gte: quantity } },
        { $inc: { availableStock: -quantity } },
        { new: true, session },
    );

    if (!product) throw new Error("INSUFFICIENT_STOCK_OR_NOT_FOUND");

    const created = await Reservation.create(
        [
            {
                productId,
                quantity,
                status: "ACTIVE",
                expiresAt,
                userId,
            },
        ],
        { session },
    );

    const reservationDoc = created[0];

    return {
        reservationId: reservationDoc._id,
        expiresAt: reservationDoc.expiresAt,
        productName: product.name, // optional helper
        unitPrice: product.price ?? 0, // optional helper
    };
};

// Confirm Reservation Service
const confirmReservationService = async ({ reservationId }) => {
    const reservation = await Reservation.findById(reservationId);

    if (!reservation) throw new Error("RESERVATION_NOT_FOUND");

    if (reservation.status === "CANCELLED")
        throw new Error("RESERVATION_CANCELLED");

    if (reservation.status === "EXPIRED")
        throw new Error("RESERVATION_EXPIRED");

    if (reservation.status === "CONFIRMED") {
        return { status: "CONFIRMED", alreadyConfirmed: true };
    }

    if (reservation.status !== "ACTIVE")
        throw new Error("RESERVATION_NOT_ACTIVE");

    // Atomic + idempotent confirm
    const updated = await Reservation.findOneAndUpdate(
        { _id: reservationId, status: "ACTIVE" },
        { $set: { status: "CONFIRMED" } },
        { new: true },
    );

    if (updated) {
        await redisConnection.del(`reservation:${reservationId}`);
        return { status: "CONFIRMED", alreadyConfirmed: false };
    }

    throw new Error(`RESERVATION_NOT_CONFIRMABLE_${reservation.status}`);
};

// Cancel Reservation Service
const cancelReservationService = async ({ reservationId }) => {
    const session = await mongoose.startSession();

    try {
        let finalStatus;
        let alreadyCancelled = false;

        await session.withTransaction(async () => {
            const reservation =
                await Reservation.findById(reservationId).session(session);

            if (!reservation) throw new Error("RESERVATION_NOT_FOUND");

            if (reservation.status === "CANCELLED") {
                finalStatus = "CANCELLED";
                alreadyCancelled = true;
                return;
            }

            if (reservation.status === "EXPIRED")
                throw new Error("RESERVATION_EXPIRED");

            if (reservation.status === "CONFIRMED") {
                throw new Error("RESERVATION_CONFIRMED");
            }

            if (reservation.status !== "ACTIVE") {
                throw new Error("RESERVATION_NOT_ACTIVE");
            }

            await Product.updateOne(
                { _id: reservation.productId },
                { $inc: { availableStock: reservation.quantity } },
                { session },
            );

            reservation.status = "CANCELLED";
            await reservation.save({ session });

            finalStatus = "CANCELLED";
        });

        await redisConnection.del(`reservation:${reservationId}`);
        return { status: finalStatus, alreadyCancelled };
    } finally {
        session.endSession();
    }
};

module.exports = {
    createReservationService,
    confirmReservationService,
    cancelReservationService,
    TTL_MINUTES,
};
