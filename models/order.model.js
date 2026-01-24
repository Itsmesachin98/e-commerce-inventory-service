const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
    {
        // ✅ Link order to reservation (checkout hold)
        reservationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Reservation",
            required: true,
            index: true,
            unique: true, // ✅ One reservation should map to only one order
        },

        // Product snapshot (good practice)
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
            index: true,
        },

        // productNameSnapshot = product name locked at order time
        productNameSnapshot: {
            type: String,
            required: true,
            trim: true,
        },

        quantity: {
            type: Number,
            required: true,
            min: 1,
        },

        // Money fields (store in smallest unit: paise/cents)
        // unitPrice = price per unit locked at order time
        unitPrice: {
            type: Number,
            required: true,
            min: 0,
        },

        totalAmount: {
            type: Number,
            required: true,
            min: 0,
        },

        status: {
            type: String,
            enum: [
                "PENDING_PAYMENT",
                "CONFIRMED",
                "CANCELLED",
                "EXPIRED",
                "FAILED",
            ],
            default: "PENDING_PAYMENT",
            index: true,
        },

        // ✅ Optional: link to user (if your app has auth)
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true,
        },

        // ✅ Payment metadata (optional now, useful later)
        payment: {
            provider: {
                type: String,
                default: null, // Razorpay / Stripe etc.
            },
            paymentId: {
                type: String,
                default: null,
            },
            method: {
                type: String,
                default: null, // card/upi/netbanking etc.
            },
            paidAt: {
                type: Date,
                default: null,
            },
        },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

// ✅ Very useful for dashboards (recent orders for a user)
orderSchema.index({ userId: 1, createdAt: -1 });

// ✅ Safety: calculate totalAmount automatically if not provided
// orderSchema.pre("validate", function (next) {
//     if (this.unitPrice != null && this.quantity != null) {
//         this.totalAmount = this.unitPrice * this.quantity;
//     }
//     next();
// });

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
