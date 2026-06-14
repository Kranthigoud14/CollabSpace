import { GoogleGenerativeAI } from "@google/generative-ai";
import { prompts } from "./prompt.service.js";

let genAI = null;
let useMock = false;

/**
 * Initialize Gemini client
 */
const initGenAI = () => {
  if (genAI || useMock) return;

  if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY not found — switching to mock mode");
    useMock = true;
    return;
  }

  try {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  } catch (err) {
    console.error("Gemini initialization failed:", err.message);
    useMock = true;
  }
};

/**
 * Core AI response handler
 */
const getModelResponse = async (prompt) => {
  try {
    initGenAI();

    if (useMock) {
      return `[MOCK RESPONSE] ${prompt}`.slice(0, 800);
    }

    const model = genAI.getGenerativeModel({
 model: "gemini-2.5-flash"
});
    const result = await model.generateContent(prompt);
    const response = await result.response;

    if (!response) {
      throw new Error("Empty response from Gemini");
    }

    return response.text();
  } catch (error) {
    console.error("AI ERROR:", error);
    return "AI service temporarily unavailable";
  }
};

/**
 * Summarize content
 */
export const summarizeContent = (content) => {
  return getModelResponse(prompts.summarize(content));
};

/**
 * Generate tasks from content
 */
export const generateTasks = (content) => {
  return getModelResponse(prompts.tasks(content));
};

/**
 * Chat with AI
 */
export const askAI = (question) => {
  return getModelResponse(prompts.chat(question));
};