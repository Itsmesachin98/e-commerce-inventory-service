const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Product name is required"],
            trim: true,
            minlength: [2, "Product name must be at least 2 characters"],
            maxlength: [120, "Product name must be at most 120 characters"],
        },

        totalStock: {
            type: Number,
            required: [true, "Total stock is required"],
            min: [0, "Total stock cannot be negative"],
        },

        // This is your "real-time stock" that prevents overselling
        availableStock: {
            type: Number,
            required: [true, "Available stock is required"],
            min: [0, "Available stock cannot be negative"],
        },

        // Optional (useful if you want reporting/debugging)
        reservedStock: {
            type: Number,
            default: 0,
            min: [0, "Reserved stock cannot be negative"],
        },
    },
    {
        timestamps: true,
        versionKey: false,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Important for searching product by name
productSchema.index({ name: 1 });

// Safety: prevent any invalid state like availableStock > totalStock
productSchema.pre("save", function (next) {
    if (this.availableStock > this.totalStock) {
        return next(
            new Error("availableStock cannot be greater than totalStock")
        );
    }

    // Optional: keep reservedStock in sync (if you want)
    // reservedStock = totalStock - availableStock
    this.reservedStock = this.totalStock - this.availableStock;

    next();
});

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
