const Redis = require("ioredis");  //redis client for nodejs
const moment = require("moment");  //for time

const redisClient = new Redis({ url: "redis://localhost:6379" });

const Rate_limit_duration = 60;  // 1 minute
const number = 20;  // 20 requests per 1 minute
const minInterval = 1;  // 1 request per second

module.exports = {
    rateLimiter: async (req, res, next) => {
        const userid = req.headers["user_id"];
        if (!userid) {
            return res.status(400).json({ success: false, message: "User ID is required" });  // if not userid
        }

        const currentTime = moment().unix();  // current time in seconds 

        // the rate limit data from Redis
        const result = await redisClient.hgetall(userid);  // Retrieve user-specific rate limit data

        if (Object.keys(result).length === 0) {
            // First request from this user
            await redisClient.hset(userid, {
                "createdAt": currentTime,
                "lastRequestAt": currentTime,
                "count": 1
            });
            return next();
        }

        if (result) {
            const difference = currentTime - result["createdAt"];    // for 20 req per minute
            const lastRequestDifference = currentTime - result["lastRequestAt"];   //for 1 req per second

            // Check last request was made less  second ago
            if (lastRequestDifference < minInterval) {
                return res.status(429).json({
                    success: false,
                    message: "Too many requests, please wait a second before trying again."
                });
            }

            if (difference > Rate_limit_duration) {
                // time difference exceeds the rate limit duration then reset the counter
                await redisClient.hset(userid, {
                    "createdAt": currentTime,
                    "lastRequestAt": currentTime,
                    "count": 1
                });
                return next();
            }
        }

        // request count exceeds the allowed limit
        if (parseInt(result["count"]) >= number) {
            return res.status(429).json({
                success: false,
                message: "User rate-limited"
            });
        } else {
            // Increment the request count and update the last request time
            await redisClient.hset(userid, {
                "count": parseInt(result["count"]) + 1,
                "lastRequestAt": currentTime
            });
            return next();
        }
    }
};
