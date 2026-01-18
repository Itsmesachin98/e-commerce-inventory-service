const { Queue } = require("bullmq");
const { redisConnection } = require("../config/redis");

const reservationQueue = new Queue("reservation-expiry", {
    connection: redisConnection,
});

module.exports = reservationQueue;
