const mongoose = require("mongoose");

const Product = require("../models/product.model");
const Reservation = require("../models/reservation.model");
const Order = require("../models/order.model");
const { redisConnection } = require("../config/redis");
const {
    createReservationService,
    TTL_MINUTES,
} = require("./reservation.service");
const reservationQueue = require("../queues/reservation.queue");

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
                    session, // ✅ pass session
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

const confirmOrderService = async ({ orderId }) => {
    const session = await mongoose.startSession();

    try {
        let finalOrder;

        await session.withTransaction(async () => {
            const order = await Order.findById(orderId).session(session);
            if (!order) throw new Error("ORDER_NOT_FOUND");

            // Idempotency
            if (order.status === "CONFIRMED") {
                finalOrder = order;
                return;
            }

            if (order.status === "CANCELLED" || order.status === "EXPIRED") {
                throw new Error(`ORDER_NOT_CONFIRMABLE_${order.status}`);
            }

            const reservation = await Reservation.findById(
                order.reservationId,
            ).session(session);
            if (!reservation) throw new Error("RESERVATION_NOT_FOUND");

            if (reservation.status === "CONFIRMED") {
                order.status = "CONFIRMED";
                await order.save({ session });
                finalOrder = order;
                return;
            }

            if (reservation.status !== "ACTIVE") {
                throw new Error(
                    `RESERVATION_NOT_CONFIRMABLE_${reservation.status}`,
                );
            }

            // confirm reservation + order together (atomic business confirm)
            reservation.status = "CONFIRMED";
            await reservation.save({ session });

            order.status = "CONFIRMED";
            await order.save({ session });

            finalOrder = order;
        });

        await redisConnection.del(
            `reservation:${finalOrder.reservationId.toString()}`,
        );

        return { orderId: finalOrder._id, status: finalOrder.status };
    } finally {
        await session.endSession();
    }
};

const cancelOrderService = async ({ orderId }) => {
    const session = await mongoose.startSession();

    try {
        let finalOrder;

        await session.withTransaction(async () => {
            const order = await Order.findById(orderId).session(session);
            if (!order) throw new Error("ORDER_NOT_FOUND");

            if (order.status === "CANCELLED") {
                finalOrder = order;
                return;
            }

            if (order.status === "CONFIRMED") {
                throw new Error("ORDER_ALREADY_CONFIRMED");
            }

            const reservation = await Reservation.findById(
                order.reservationId,
            ).session(session);
            if (!reservation) throw new Error("RESERVATION_NOT_FOUND");
        });
    } finally {
        await session.endSession();
    }
};

module.exports = {
    createOrderService,
    confirmOrderService,
    cancelOrderService,
};
