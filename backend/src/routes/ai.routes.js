import express from "express";
import {
  summarizeDocument,
  generateTasksFromDoc,
  chatWithAI,
  transformDocument,
} from "../controllers/ai.controller.js";

import { aiRateLimit } from "../middleware/aiRateLimit.middleware.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/summarize", aiRateLimit, summarizeDocument);
router.post("/tasks", aiRateLimit, generateTasksFromDoc);
router.post("/chat", aiRateLimit, chatWithAI);
router.post("/transform", aiRateLimit, transformDocument);

export default router;
