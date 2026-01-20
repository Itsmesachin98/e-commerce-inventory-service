const express = require("express");
const {
    getAllProducts,
    getOneProduct,
} = require("../controllers/product.controller");

const router = express.Router();

router.get("/products", getAllProducts);
router.get("/products/:id", getOneProduct);

module.exports = router;
