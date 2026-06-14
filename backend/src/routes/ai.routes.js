import express from "express";
import {
  summarizeDocument,
  generateTasksFromDoc,
  chatWithAI,
} from "../controllers/ai.controller.js";

import { aiRateLimit } from "../middleware/aiRateLimit.middleware.js";

const router = express.Router();

/**
 * AI ROUTES (PROTECTED WITH RATE LIMIT)
 */
router.post("/summarize", aiRateLimit, summarizeDocument);

router.post("/tasks", aiRateLimit, generateTasksFromDoc);

router.post("/chat", aiRateLimit, chatWithAI);

export default router;