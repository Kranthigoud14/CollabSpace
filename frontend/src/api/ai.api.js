import api from './axios';

const extractAIData = (res) => {
  const payload = res?.data ?? res;
  if (typeof payload?.data === 'string') return payload.data;
  if (typeof payload?.data?.data === 'string') return payload.data.data;
  return null;
};

export const suggestNext = async (text) => {
  const res = await api.post('/ai/chat', { question: text });
  return res.data;
};

export const summarize = async (text) => {
  const res = await api.post('/ai/summarize', { content: text });
  return res.data;
};

export const transform = async (action, content, context = '') => {
  const res = await api.post('/ai/transform', { action, content, context });
  return res.data;
};

export const generateTasksFromDoc = async (text) => {
  const res = await api.post('/ai/tasks', { content: text });
  return res.data;
};

export { extractAIData };
