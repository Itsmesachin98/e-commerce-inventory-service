require("dotenv").config();

const { Worker } = require("bullmq");
const mongoose = require("mongoose");

const { redisConnection } = require("../config/redis");
const Product = require("../models/product.model");
const Reservation = require("../models/reservation.model");
const Order = require("../models/order.model");

const startWorker = async () => {
    // IMPORTANT: connect MongoDB in worker process
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Worker MongoDB connected");

    new Worker(
        "reservation-expiry",
        async (job) => {
            const { reservationId } = job.data;

            const redisKey = `reservation:${reservationId}`;

            // If key still exists, reservation is still active (not expired yet)
            // If key is missing => TTL expired OR manually deleted
            const keyExists = await redisConnection.exists(redisKey);

            console.log("Test 1");

            // Most correct flow:
            // If key is missing, we should expire it in DB and restore stock
            if (keyExists) return;

            console.log("Test 2");

            const session = await mongoose.startSession();

            try {
                console.log("Test 3");
                await session.withTransaction(async () => {
                    const reservation = await Reservation.findOne({
                        _id: reservationId,
                        status: "ACTIVE",
                    }).session(session);

                    console.log("Test 4");

                    if (!reservation) return; // already confirmed/cancelled/expired

                    console.log("Test 5");

                    // Mark reservation as expired
                    reservation.status = "EXPIRED";
                    await reservation.save({ session });

                    console.log("Test 6");

                    // Restore stock
                    await Product.updateOne(
                        { _id: reservation.productId },
                        { $inc: { availableStock: reservation.quantity } },
                        { session },
                    );

                    console.log("Test 7");

                    // Cancel pending order linked to this reservation
                    await Order.updateOne(
                        {
                            reservationId: reservation._id,
                            status: "PENDING_PAYMENT",
                        },
                        {
                            $set: {
                                status: "EXPIRED",
                            },
                        },
                        { session },
                    );

                    console.log("Test 8");
                });
            } finally {
                session.endSession();
            }
        },
        {
            connection: redisConnection,
        },
    );

    console.log("Reservation Expiry Worker running...");
};

startWorker().catch((err) => {
    console.error("Worker failed to start:", err);
    process.exit(1);
});
