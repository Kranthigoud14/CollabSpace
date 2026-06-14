import express from "express";
import {
  registerUser,
  loginUser,
  getProfile
} from "../controllers/auth.controller.js";

import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/profile", authMiddleware, getProfile);

router.post("/logout", (req, res) => {
  res.json({ message: "Logged out successfully" });
});

export default router;