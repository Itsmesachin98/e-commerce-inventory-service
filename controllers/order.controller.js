const mongoose = require("mongoose");

const {
    createOrderService,
    confirmOrderService,
    cancelOrderService,
} = require("../services/order.service");

// POST /order
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

// POST /order/:id/confirm
const confirmOrder = async (req, res) => {
    try {
        const { id: orderId } = req.params;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: "orderId is required",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res
                .status(400)
                .json({ success: false, message: "Invalid orderId" });
        }

        const data = await confirmOrderService({ orderId });

        return res.status(200).json({
            success: true,
            message: data.alreadyConfirmed
                ? "Order already confirmed"
                : "Order confirmed successfully",
            data,
        });
    } catch (error) {
        if (error.message === "ORDER_NOT_FOUND") {
            return res
                .status(404)
                .json({ success: false, message: "Order not found" });
        }

        if (error.message === "ORDER_NOT_CONFIRMABLE") {
            return res.status(409).json({
                success: false,
                message: "Order is either cancelled expired or failed",
            });
        }

        if (error.message === "ORDER_NOT_PENDING_PAYMENT") {
            return res.status(409).json({
                success: false,
                message: "Order is not pending payment",
            });
        }

        if (error.message === "RESERVATION_NOT_FOUND") {
            return res.status(409).json({
                success: false,
                message: "Reservation not found",
            });
        }

        console.error("Confirm order error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while confirming the order",
        });
    }
};

// POST /order/:id/cancel
const cancelOrder = async (req, res) => {
    try {
        const { id: orderId } = req.params;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: "orderId is required",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res
                .status(400)
                .json({ success: false, message: "Invalid orderId" });
        }

        const data = await cancelOrderService({ orderId });

        return res.status(200).json({
            success: true,
            message: "Order cancelled successfully",
            data,
        });
    } catch (error) {
        if (error.message === "ORDER_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        if (error.message === "ORDER_NOT_CANCELLABLE") {
            return res.status(409).json({
                success: false,
                message: "Order cannot be cancelled in its current status",
            });
        }

        if (error.message === "RESERVATION_NOT_ACTIVE") {
            return res.status(409).json({
                success: false,
                message: "Reservation is not active",
            });
        }

        console.error("cancelOrder error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while cancelling the order",
        });
    }
};

module.exports = { createOrder, confirmOrder, cancelOrder };
