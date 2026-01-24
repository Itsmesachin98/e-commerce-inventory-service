const mongoose = require("mongoose");

const { createOrderService } = require("../services/order.service");

const createOrder = async (req, res) => {
    try {
        const { productId, qty } = req.body;

        const quantity = Number(qty);

        // Validate input
        if (!productId) {
            return res.status(400).json({
                success: false,
                message: "productId is required",
            });
        }

        if (!Number.isInteger(quantity) || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: "qty must be a positive integer",
            });
        }

        const data = await createOrderService({
            productId,
            quantity,
            userId: req.user?._id || null,
        });

        return res.status(201).json({
            success: true,
            message: "Order created (payment pending)",
            data,
        });
    } catch (error) {
        // Known errors mapping
        if (error.message === "PRODUCT_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        if (error.message === "INSUFFICIENT_STOCK_OR_NOT_FOUND") {
            return res.status(409).json({
                success: false,
                message: "Insufficient stock",
            });
        }

        // Default server error
        console.error("createOrder error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while creating the order",
        });
    }
};

module.exports = { createOrder };
