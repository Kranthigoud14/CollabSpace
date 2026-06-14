import {
  summarizeContent,
  generateTasks,
  askAI,
  transformContent,
  MAX_CONTENT_LENGTH,
  UNAVAILABLE_MSG,
} from "../services/ai.service.js";

import { successResponse, errorResponse } from "../utils/apiResponse.js";

const validateContent = (content, res) => {
  if (!content || content.trim().length === 0) {
    errorResponse(res, "Content is required", null, 400);
    return false;
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    errorResponse(
      res,
      `Content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters`,
      null,
      400
    );
    return false;
  }

  return true;
};

const handleAIResult = async (res, promise, successMessage) => {
  try {
    const result = await promise;

    if (!result || result === UNAVAILABLE_MSG) {
      return errorResponse(res, UNAVAILABLE_MSG, null, 503);
    }

    return successResponse(res, successMessage, result);
  } catch (error) {
    return errorResponse(
      res,
      error.message || "AI request failed",
      null,
      503
    );
  }
};

export const summarizeDocument = async (req, res) => {
  const { content } = req.body;
  if (!validateContent(content, res)) return;
  return handleAIResult(
    res,
    summarizeContent(content),
    "Summary generated successfully"
  );
};

export const generateTasksFromDoc = async (req, res) => {
  const { content } = req.body;
  if (!validateContent(content, res)) return;
  return handleAIResult(
    res,
    generateTasks(content),
    "Tasks generated successfully"
  );
};

export const chatWithAI = async (req, res) => {
  const { question } = req.body;

  if (!question || question.trim().length === 0) {
    return errorResponse(res, "Question is required", null, 400);
  }

  if (question.length > MAX_CONTENT_LENGTH) {
    return errorResponse(
      res,
      `Question exceeds maximum length of ${MAX_CONTENT_LENGTH} characters`,
      null,
      400
    );
  }

  return handleAIResult(
    res,
    askAI(question),
    "Response generated successfully"
  );
};

const VALID_ACTIONS = [
  "improve",
  "rewrite",
  "expand",
  "shorten",
  "grammar",
  "generate",
  "continue",
];

export const transformDocument = async (req, res) => {
  const { action, content, context } = req.body;

  if (!action || !VALID_ACTIONS.includes(action)) {
    return errorResponse(
      res,
      `Invalid action. Must be one of: ${VALID_ACTIONS.join(", ")}`,
      null,
      400
    );
  }

  if (!validateContent(content, res)) return;

  return handleAIResult(
    res,
    transformContent(action, content, context || ""),
    "Content transformed successfully"
  );
};
