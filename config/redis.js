require("dotenv").config();

const Redis = require("ioredis");

const redisConnection = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null, // ✅ REQUIRED by BullMQ workers
});

redisConnection.on("connect", () => console.log("Redis connecting..."));

redisConnection.on("ready", async () => {
    console.log("Redis connected and ready");
    await redisConnection.set("foo", "bar");
});

redisConnection.on("error", (err) => console.error("Redis error:", err));
redisConnection.on("end", () => console.log("Redis connection closed"));

const connectRedis = async () => {
    // ioredis auto-connects, so you don't need redisConnection.connect()
    // but we keep this function for your project structure consistency
    return redisConnection;
};

connectRedis();

module.exports = { redisConnection, connectRedis };
