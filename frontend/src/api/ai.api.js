import api from './axios';

const extractAIData = (res) => {
  if (!res) return null;
  if (typeof res === 'string') return res;
  if (typeof res?.data === 'string') return res.data;
  if (typeof res?.data?.data === 'string') return res.data.data;
  if (typeof res?.data?.result === 'string') return res.data.result;
  if (typeof res?.result === 'string') return res.result;
  const payload = res?.data ?? res;
  if (typeof payload === 'string') return payload;
  if (typeof payload?.data === 'string') return payload.data;
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
