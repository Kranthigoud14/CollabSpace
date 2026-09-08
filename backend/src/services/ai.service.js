import { GoogleGenerativeAI } from "@google/generative-ai";
import { prompts } from "./prompt.service.js";

const MAX_CONTENT_LENGTH = 50000;
const CHUNK_SIZE = 12000;

let genAI = null;

const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey.startsWith("placeholder")) {
    throw new Error(
      "Gemini API key is not configured. Please set a valid GEMINI_API_KEY in the server environment."
    );
  }

  if (!genAI) {
    genAI = new GoogleGenerativeAI(apiKey.trim());
  }
  return genAI;
};

/**
 * Executes prompt against Gemini with model fallback
 */
const getModelResponse = async (prompt) => {
  const ai = getGenAI();
  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
  let lastError = null;

  for (const modelName of models) {
    try {
      const model = ai.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;

      if (!response) {
        throw new Error("Empty response from AI provider");
      }

      const text = response.text()?.trim();
      if (!text) {
        throw new Error("Empty text returned from AI provider");
      }

      return text;
    } catch (err) {
      lastError = err;
      const errMsg = err?.message || "";
      // If model not found (404), try next model in cascade
      if (errMsg.includes("404") || errMsg.includes("not found")) {
        continue;
      }
      // If invalid API key, throw user-friendly error immediately
      if (errMsg.includes("API_KEY_INVALID") || errMsg.includes("API key not valid")) {
        throw new Error("Invalid Gemini API key. Please check your server GEMINI_API_KEY setting.");
      }
      if (errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota")) {
        throw new Error("Gemini AI rate limit or quota reached. Please try again in a few moments.");
      }
      break;
    }
  }

  const cleanMessage =
    lastError?.message?.includes("API_KEY_INVALID") || lastError?.message?.includes("API key not valid")
      ? "Invalid Gemini API key. Please verify your GEMINI_API_KEY."
      : lastError?.message || "AI service is currently unavailable. Please try again later.";

  throw new Error(cleanMessage);
};

/**
 * Splits large text into readable chunks
 */
const chunkText = (text, size = CHUNK_SIZE) => {
  if (text.length <= size) return [text];

  const chunks = [];
  let index = 0;
  while (index < text.length) {
    let nextIndex = Math.min(index + size, text.length);
    if (nextIndex < text.length) {
      const breakPoint = text.lastIndexOf("\n", nextIndex);
      if (breakPoint > index + 2000) {
        nextIndex = breakPoint;
      }
    }
    chunks.push(text.slice(index, nextIndex).trim());
    index = nextIndex;
  }
  return chunks;
};

/**
 * Summarize content (with chunking support for large documents)
 */
export const summarizeContent = async (content) => {
  if (!content || !content.trim()) {
    throw new Error("No content provided to summarize");
  }

  const chunks = chunkText(content.trim());
  if (chunks.length === 1) {
    return getModelResponse(prompts.summarize(chunks[0]));
  }

  // Multi-chunk summary
  const chunkSummaries = [];
  for (const chunk of chunks) {
    const summary = await getModelResponse(prompts.summarize(chunk));
    chunkSummaries.push(summary);
  }

  const combined = chunkSummaries.join("\n\n");
  return getModelResponse(
    `Synthesize and unify these section summaries into a single cohesive 4-6 line summary:\n\n${combined}`
  );
};

/**
 * Generate tasks / action items
 */
export const generateTasks = async (content) => {
  if (!content || !content.trim()) {
    throw new Error("No content provided to generate tasks");
  }

  const chunks = chunkText(content.trim());
  if (chunks.length === 1) {
    return getModelResponse(prompts.tasks(chunks[0]));
  }

  const chunkTasks = [];
  for (const chunk of chunks) {
    const tasks = await getModelResponse(prompts.tasks(chunk));
    chunkTasks.push(tasks);
  }

  return chunkTasks.join("\n");
};

/**
 * Freeform chat / query with AI
 */
export const askAI = (question) => {
  if (!question || !question.trim()) {
    throw new Error("No question provided");
  }
  return getModelResponse(prompts.chat(question.trim()));
};

/**
 * Transform text (improve, rewrite, expand, concise, key_points, action_items, etc.)
 */
export const transformContent = async (action, content, context = "") => {
  if (!content || !content.trim()) {
    throw new Error("No content provided to transform");
  }

  // If text is extremely large, process in chunks or limit
  const trimmed = content.trim();
  if (trimmed.length > CHUNK_SIZE && action === "summarize") {
    return summarizeContent(trimmed);
  }

  return getModelResponse(prompts.transform(action, trimmed, context));
};

export { MAX_CONTENT_LENGTH };
