const mongoose = require("mongoose");

const {
    createOrderService,
    confirmOrderService,
    cancelOrderService,
} = require("../services/order.service");

const Order = require("../models/order.model");

// GET /order
const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find().select("-payment");

        return res.status(200).json({
            success: true,
            message: "Orders fetched successfully",
            data: orders,
        });
    } catch (error) {
        console.error("Error fetching orders:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch orders",
            error: error.message,
        });
    }
};

// GET /order/:id
const getOneOrder = async (req, res) => {
    const { id: orderId } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid orderId",
        });
    }

    try {
        const order = await Order.findById(orderId).select("-payment");

        // Not found
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found",
            });
        }

        // Success
        return res.status(200).json({
            success: true,
            message: "Order fetched successfully",
            data: order,
        });
    } catch (error) {
        console.error("Error fetching order:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch order",
            error: error.message,
        });
    }
};

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

module.exports = {
    getAllOrders,
    getOneOrder,
    createOrder,
    confirmOrder,
    cancelOrder,
};
