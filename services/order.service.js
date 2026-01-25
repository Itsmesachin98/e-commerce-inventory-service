const mongoose = require("mongoose");

const Product = require("../models/product.model");
const Order = require("../models/order.model");

const {
    createReservationService,
    confirmReservationService,
    cancelReservationService,
    TTL_MINUTES,
} = require("./reservation.service");

const { redisConnection } = require("../config/redis");
const reservationQueue = require("../queues/reservation.queue");

// Create order service
const createOrderService = async ({ productId, quantity, userId = null }) => {
    const session = await mongoose.startSession();

    let result;

    try {
        await session.withTransaction(async () => {
            const product = await Product.findById(productId).session(session);
            if (!product) throw new Error("PRODUCT_NOT_FOUND");

            const { reservationId, expiresAt } = await createReservationService(
                {
                    productId,
                    quantity,
                    userId,
                    session, // Pass session
                },
            );

            const unitPrice = product.price ?? 0;

            const createOrders = await Order.create(
                [
                    {
                        reservationId,
                        productId,
                        productNameSnapshot: product.name,
                        quantity,
                        unitPrice,
                        totalAmount: unitPrice * quantity,
                        status: "PENDING_PAYMENT",
                        userId,
                    },
                ],
                { session },
            );

            const order = createOrders[0];

            result = {
                orderId: order._id,
                reservationId,
                expiresAt,
                status: order.status,
            };
        });

        /**
         * IMPORTANT:
         * This part runs ONLY after MongoDB transaction is successful
         * (no rollback confusion)
         */

        const redisKey = `reservation:${result.reservationId.toString()}`;
        await redisConnection.set(redisKey, "ACTIVE", "EX", TTL_MINUTES * 60);

        await reservationQueue.add(
            "expire-reservation",
            { reservationId: result.reservationId.toString() },
            { delay: TTL_MINUTES * 60 * 1000 },
        );

        return result;
    } finally {
        await session.endSession();
    }
};

// Confirm order service
const confirmOrderService = async ({ orderId }) => {
    const session = await mongoose.startSession();

    let result;
    let alreadyConfirmed = false;

    try {
        await session.withTransaction(async () => {
            const order = await Order.findById(orderId).session(session);

            if (!order) throw new Error("ORDER_NOT_FOUND");

            // Idempotency
            if (order.status === "CONFIRMED") {
                alreadyConfirmed = true;
                result = order;
                return;
            }

            if (
                order.status === "CANCELLED" ||
                order.status === "EXPIRED" ||
                order.status === "FAILED"
            ) {
                throw new Error(`ORDER_NOT_CONFIRMABLE`);
            }

            if (order.status !== "PENDING_PAYMENT") {
                console.log("how the fuck am i getting error here");
                throw new Error("ORDER_NOT_PENDING_PAYMENT");
            }

            // Confirm reservation (same transaction)
            const reservation = await confirmReservationService({
                reservationId: order.reservationId,
                session,
            });

            // Confirm order
            order.status = "CONFIRMED";
            await order.save({ session });

            result = order;
        });

        // After commit: remove Redis key so worker won't expire it
        const redisKey = `reservation:${result.reservationId.toString()}`;
        await redisConnection.del(redisKey);

        return { result, alreadyConfirmed };
    } finally {
        await session.endSession();
    }
};

// Cancel order service
const cancelOrderService = async ({ orderId }) => {
    const session = await mongoose.startSession();

    let result;

    try {
        await session.withTransaction(async () => {
            const order = await Order.findById(orderId).session(session);

            if (!order) throw new Error("ORDER_NOT_FOUND");

            // Only allow cancel when payment not completed
            if (order.status !== "PENDING_PAYMENT") {
                throw new Error("ORDER_NOT_CANCELLABLE");
            }

            await cancelReservationService({
                reservationId: order.reservationId,
                session,
            });

            // Cancel order
            order.status = "CANCELLED";
            await order.save({ session });

            result = {
                orderId: order._id,
                reservationId: order.reservationId,
                status: order.status,
            };
        });

        // After commit: remove Redis key so expiry worker won’t expire
        const redisKey = `reservation:${result.reservationId.toString()}`;
        await redisConnection.del(redisKey);

        return result;
    } finally {
        await session.endSession();
    }
};

module.exports = {
    createOrderService,
    confirmOrderService,
    cancelOrderService,
};
