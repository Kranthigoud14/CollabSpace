import api from './axios';

export const suggestNext = async (text) => {
  // Use chat endpoint to get suggestion
  const res = await api.post('/ai/chat', { question: text });
  // backend returns { success, message, data }
  return res.data;
};

export const summarize = async (text) => {
  const res = await api.post('/ai/summarize', { content: text });
  return res.data;
};
