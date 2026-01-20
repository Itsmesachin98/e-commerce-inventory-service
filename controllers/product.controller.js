const mongoose = require("mongoose");

const Product = require("../models/product.model");

const getAllProducts = async (req, res) => {
    try {
        const products = await Product.find();

        return res.status(200).json({
            success: true,
            message: "Products fetched successfully",
            data: products,
        });
    } catch (error) {
        console.error("Error fetching products:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch products",
            error: error.message,
        });
    }
};

const getOneProduct = async (req, res) => {
    const { id: proudctId } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(proudctId)) {
        return res.status(400).json({
            success: false,
            message: "Invalid proudctId",
        });
    }

    try {
        const product = await Product.findById(proudctId);

        // Not found
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        // Success
        return res.status(200).json({
            success: true,
            message: "Product fetched successfully",
            data: product,
        });
    } catch (error) {
        console.error("Error fetching product:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch product",
            error: error.message,
        });
    }
};

module.exports = { getAllProducts, getOneProduct };
