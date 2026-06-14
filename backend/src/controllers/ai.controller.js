import {
  summarizeContent,
  generateTasks,
  askAI,
} from "../services/ai.service.js";

import { successResponse, errorResponse } from "../utils/apiResponse.js";

/**
 * SUMMARIZE DOCUMENT
 */
export const summarizeDocument = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return errorResponse(
        res,
        "Content is required",
        null,
        400
      );
    }

    const summary = await summarizeContent(content);

    return successResponse(
      res,
      "Summary generated successfully",
      summary
    );
  } catch (error) {
    return errorResponse(
      res,
      "Failed to generate summary",
      error.message || error,
      500
    );
  }
};

/**
 * GENERATE TASKS FROM DOCUMENT
 */
export const generateTasksFromDoc = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return errorResponse(
        res,
        "Content is required",
        null,
        400
      );
    }

    const tasks = await generateTasks(content);

    return successResponse(
      res,
      "Tasks generated successfully",
      tasks
    );
  } catch (error) {
    return errorResponse(
      res,
      "Failed to generate tasks",
      error.message || error,
      500
    );
  }
};

/**
 * CHAT WITH AI
 */
export const chatWithAI = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || question.trim().length === 0) {
      return errorResponse(
        res,
        "Question is required",
        null,
        400
      );
    }

    const answer = await askAI(question);

    return successResponse(
      res,
      "Response generated successfully",
      answer
    );
  } catch (error) {
    return errorResponse(
      res,
      "AI request failed",
      error.message || error,
      500
    );
  }
};