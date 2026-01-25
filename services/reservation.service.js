const Product = require("../models/product.model");
const Reservation = require("../models/reservation.model");

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

    // Atomic stock deduction inside same session
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
const confirmReservationService = async ({ reservationId, session }) => {
    const reservation = await Reservation.findOne({
        _id: reservationId,
        status: "ACTIVE",
    }).session(session);

    if (!reservation) throw new Error("RESERVATION_NOT_FOUND");

    // Extra safety check
    if (reservation.expiresAt && reservation.expiresAt <= new Date()) {
        throw new Error("RESERVATION_EXPIRED");
    }

    reservation.status = "CONFIRMED";
    await reservation.save({ session });

    return reservation;
};

// Cancel Reservation Service
const cancelReservationService = async ({ reservationId, session }) => {
    const reservation = await Reservation.findOne({
        _id: reservationId,
        status: "ACTIVE",
    }).session(session);

    if (!reservation) throw new Error("RESERVATION_NOT_ACTIVE");

    // Mark reservation as cancelled
    reservation.status = "CANCELLED";
    await reservation.save({ session });

    await Product.updateOne(
        { _id: reservation.productId },
        { $inc: { availableStock: reservation.quantity } },
        { session },
    );

    return reservation;
};

module.exports = {
    createReservationService,
    confirmReservationService,
    cancelReservationService,
    TTL_MINUTES,
};
