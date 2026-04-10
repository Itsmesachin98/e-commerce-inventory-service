const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "E-commerce Inventory Service",
            version: "1.0.0",
            description:
                "A production-grade inventory management microservice for e-commerce platforms featuring real-time stock control, reservation-based checkout, distributed transactions, and automatic expiry handling to prevent overselling.",
        },
        servers: [
            {
                url: process.env.BACKEND_URL,
                description:
                    process.env.NODE_ENV === "production"
                        ? "Production"
                        : "Development",
            },
        ],
        components: {
            schemas: {
                Product: {
                    type: "object",
                    properties: {
                        _id: {
                            type: "string",
                            description: "Product ID",
                        },
                        name: {
                            type: "string",
                            description: "Product name",
                            minLength: 2,
                            maxLength: 120,
                        },
                        price: {
                            type: "number",
                            description: "Product price",
                            minimum: 0,
                        },
                        totalStock: {
                            type: "number",
                            description: "Total stock quantity",
                            minimum: 0,
                        },
                        availableStock: {
                            type: "number",
                            description: "Available stock quantity",
                            minimum: 0,
                        },
                        reservedStock: {
                            type: "number",
                            description: "Reserved stock quantity",
                            minimum: 0,
                        },
                        createdAt: {
                            type: "string",
                            format: "date-time",
                            description: "Creation timestamp",
                        },
                        updatedAt: {
                            type: "string",
                            format: "date-time",
                            description: "Last update timestamp",
                        },
                    },
                    required: ["name", "price", "totalStock", "availableStock"],
                },
                Order: {
                    type: "object",
                    properties: {
                        _id: {
                            type: "string",
                            description: "Order ID",
                        },
                        reservationId: {
                            type: "string",
                            description: "Reservation ID",
                        },
                        productId: {
                            type: "string",
                            description: "Product ID",
                        },
                        productNameSnapshot: {
                            type: "string",
                            description: "Product name at order time",
                        },
                        quantity: {
                            type: "number",
                            description: "Order quantity",
                            minimum: 1,
                        },
                        unitPrice: {
                            type: "number",
                            description: "Price per unit",
                            minimum: 0,
                        },
                        totalAmount: {
                            type: "number",
                            description: "Total order amount",
                            minimum: 0,
                        },
                        status: {
                            type: "string",
                            enum: [
                                "PENDING_PAYMENT",
                                "CONFIRMED",
                                "CANCELLED",
                                "EXPIRED",
                                "FAILED",
                            ],
                            description: "Order status",
                        },
                        userId: {
                            type: "string",
                            description: "User ID (optional)",
                        },
                        createdAt: {
                            type: "string",
                            format: "date-time",
                            description: "Creation timestamp",
                        },
                        updatedAt: {
                            type: "string",
                            format: "date-time",
                            description: "Last update timestamp",
                        },
                    },
                    required: [
                        "reservationId",
                        "productId",
                        "productNameSnapshot",
                        "quantity",
                        "unitPrice",
                        "totalAmount",
                    ],
                },
                Reservation: {
                    type: "object",
                    properties: {
                        _id: {
                            type: "string",
                            description: "Reservation ID",
                        },
                        productId: {
                            type: "string",
                            description: "Product ID",
                        },
                        quantity: {
                            type: "number",
                            description: "Reserved quantity",
                            minimum: 1,
                        },
                        status: {
                            type: "string",
                            enum: [
                                "ACTIVE",
                                "CONFIRMED",
                                "EXPIRED",
                                "CANCELLED",
                            ],
                            description: "Reservation status",
                        },
                        expiresAt: {
                            type: "string",
                            format: "date-time",
                            description: "Expiration timestamp",
                        },
                        userId: {
                            type: "string",
                            description: "User ID (optional)",
                        },
                        createdAt: {
                            type: "string",
                            format: "date-time",
                            description: "Creation timestamp",
                        },
                        updatedAt: {
                            type: "string",
                            format: "date-time",
                            description: "Last update timestamp",
                        },
                    },
                    required: ["productId", "quantity", "expiresAt"],
                },
                Error: {
                    type: "object",
                    properties: {
                        success: {
                            type: "boolean",
                            description: "Success status",
                        },
                        message: {
                            type: "string",
                            description: "Error message",
                        },
                        error: {
                            type: "string",
                            description: "Error details",
                        },
                    },
                    required: ["success", "message"],
                },
                Success: {
                    type: "object",
                    properties: {
                        success: {
                            type: "boolean",
                            description: "Success status",
                        },
                        message: {
                            type: "string",
                            description: "Success message",
                        },
                        data: {
                            type: "object",
                            description: "Response data",
                        },
                    },
                    required: ["success", "message"],
                },
            },
        },
    },
    apis: ["./routes/*.js"], // Path to the API routes
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = {
    swaggerUi,
    swaggerSpec,
};
