import { GoogleGenerativeAI } from "@google/generative-ai";
import { prompts } from "./prompt.service.js";

const MAX_CONTENT_LENGTH = 50000;
const UNAVAILABLE_MSG = "AI service temporarily unavailable";

let genAI = null;
let useMock = false;

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

const getModelResponse = async (prompt) => {
  initGenAI();

  if (useMock) {
    return `[MOCK RESPONSE] ${prompt}`.slice(0, 800);
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });
    const result = await model.generateContent(prompt);
    const response = await result.response;

    if (!response) {
      throw new Error("Empty response from Gemini");
    }

    const text = response.text()?.trim();
    if (!text) {
      throw new Error("Empty text from Gemini");
    }

    return text;
  } catch (error) {
    console.error("AI ERROR:", error);
    throw new Error(UNAVAILABLE_MSG);
  }
};

export const summarizeContent = (content) => {
  return getModelResponse(prompts.summarize(content));
};

export const generateTasks = (content) => {
  return getModelResponse(prompts.tasks(content));
};

export const askAI = (question) => {
  return getModelResponse(prompts.chat(question));
};

export const transformContent = (action, content, context = "") => {
  return getModelResponse(prompts.transform(action, content, context));
};

export { MAX_CONTENT_LENGTH, UNAVAILABLE_MSG };
