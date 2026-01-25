const express = require("express");

const {
    createOrder,
    confirmOrder,
    cancelOrder,
    getAllOrders,
    getOneOrder,
} = require("../controllers/order.controller");

const router = express.Router();

router.get("/", getAllOrders);
router.get("/:id", getOneOrder);

router.post("/", createOrder);
router.post("/:id/confirm", confirmOrder);
router.post("/:id/cancel", cancelOrder);

module.exports = router;
