const express = require("express");

const {
    createOrder,
    confirmOrder,
    cancelOrder,
    getAllOrders,
    getOneOrder,
} = require("../controllers/order.controller");

const router = express.Router();

/**
 * @swagger
 * /order:
 *   get:
 *     summary: Get all orders
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: Registered successfully
 *       400:
 *         description: Validation error
 */
router.get("/", getAllOrders);

/**
 * @swagger
 * /order/{id}:
 *   get:
 *     summary: Get an order by ID
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order fetched successfully
 *       400:
 *         description: Invalid order ID
 *       404:
 *         description: Order not found
 *       500:
 *         description: Server error
 */
router.get("/:id", getOneOrder);

/**
 * @swagger
 * /order:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - qty
 *             properties:
 *               productId:
 *                 type: string
 *                 description: Product ID
 *               qty:
 *                 type: integer
 *                 description: Quantity to order
 *                 minimum: 1
 *     responses:
 *       201:
 *         description: Order created (payment pending)
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Product not found
 *       409:
 *         description: Insufficient stock
 *       500:
 *         description: Server error
 */
router.post("/", createOrder);

/**
 * @swagger
 * /order/{id}/confirm:
 *   post:
 *     summary: Confirm an order
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order confirmed successfully
 *       400:
 *         description: Invalid order ID
 *       404:
 *         description: Order not found
 *       409:
 *         description: Order cannot be confirmed
 *       500:
 *         description: Server error
 */
router.post("/:id/confirm", confirmOrder);

/**
 * @swagger
 * /order/{id}/cancel:
 *   post:
 *     summary: Cancel an order
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 *       400:
 *         description: Invalid order ID
 *       404:
 *         description: Order not found
 *       409:
 *         description: Order cannot be cancelled
 *       500:
 *         description: Server error
 */
router.post("/:id/cancel", cancelOrder);

module.exports = router;
