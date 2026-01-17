const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: [true, "productId is required"],
            index: true,
        },

        quantity: {
            type: Number,
            required: [true, "quantity is required"],
            min: [1, "quantity must be at least 1"],
        },

        status: {
            type: String,
            enum: ["ACTIVE", "CONFIRMED", "EXPIRED", "CANCELLED"],
            default: "ACTIVE",
            index: true,
        },

        expiresAt: {
            type: Date,
            required: [true, "expiresAt is required"],
            index: true,
        },

        // Optional (you may keep it as String also if you don’t want full User model)
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

// Useful index for querying active reservations fast
reservationSchema.index({ productId: 1, status: 1 });

// Optional: prevent creating reservations in the past
reservationSchema.pre("validate", function (next) {
    if (this.expiresAt && this.expiresAt <= new Date()) {
        return next(new Error("expiresAt must be in the future"));
    }
    next();
});

const Reservation = mongoose.model("Reservation", reservationSchema);

module.exports = Reservation;
