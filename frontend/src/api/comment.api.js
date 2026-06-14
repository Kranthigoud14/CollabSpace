import api from "./axios";

// create comment
export const createComment = (data) =>
  api.post("/comments", data);

// get comments for document
export const getComments = (documentId) =>
  api.get(`/comments/document/${documentId}`);

// resolve comment
export const resolveComment = (id) =>
  api.patch(`/comments/${id}/resolve`);

// delete comment
export const deleteComment = (id) =>
  api.delete(`/comments/${id}`);

// update comment
export const updateComment = (id, data) =>
  api.put(`/comments/${id}`, data);

// reply to comment
export const replyComment = (id, text) =>
  api.post(`/comments/${id}/reply`, { text });