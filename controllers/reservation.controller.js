const mongoose = require("mongoose");

const { redisConnection } = require("../config/redis");
const Product = require("../models/product.model");
const Reservation = require("../models/reservation.model");
const reservationQueue = require("../queues/reservation.queue");

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

        const reservationTTLMinutes = 1;
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

module.exports = createReservation;
