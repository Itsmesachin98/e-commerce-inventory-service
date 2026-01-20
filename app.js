const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const connectDB = require("./config/db");
const { connectRedis } = require("./config/redis");

const reservationRoute = require("./routes/reservation.route");
const productRoute = require("./routes/product.route");

const PORT = process.env.PORT || 3000;

connectDB();

(async () => {
    try {
        await connectRedis();
    } catch (err) {
        console.error("Redis failed to connect", err);
        process.exit(1);
    }
})();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/", reservationRoute);
app.use("/", productRoute);

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
