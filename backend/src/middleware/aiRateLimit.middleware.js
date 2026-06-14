import rateLimit from "express-rate-limit";

export const aiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per minute

  message: {
    message: "Too many AI requests. Please wait and try again.",
  },

  standardHeaders: true,
  legacyHeaders: false,
});