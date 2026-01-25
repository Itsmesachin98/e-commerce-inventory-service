const express = require("express");

const {
    createOrder,
    confirmOrder,
    cancelOrder,
} = require("../controllers/order.controller");

const router = express.Router();

router.post("/", createOrder);
router.post("/:id/confirm", confirmOrder);
router.post("/:id/cancel", cancelOrder);

module.exports = router;
