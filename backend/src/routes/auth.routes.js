import express from "express";
import {
  registerUser,
  loginUser,
  getProfile
} from "../controllers/auth.controller.js";

import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

// REGISTER
router.post("/register", registerUser);

// LOGIN
router.post("/login", loginUser);

// PROFILE (PROTECTED)
router.get("/profile", authMiddleware, getProfile);

// LOGOUT (PROTECTED + CONSISTENT RESPONSE)
router.post("/logout", authMiddleware, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

export default router;