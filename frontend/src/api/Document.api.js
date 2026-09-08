import api from "./axios";

// CREATE DOCUMENT
export const createDocument = async (data) => {
  const res = await api.post("/documents", data);
  return res.data;
};

// GET MY DOCUMENTS
export const getMyDocuments = async () => {
  const res = await api.get("/documents/my");
  return res.data;
};

// GET ALL DOCUMENTS
export const getDocuments = async () => {
  const res = await api.get("/documents");
  return res.data;
};

// GET BY ID
export const getDocumentById = async (id) => {
  const res = await api.get(`/documents/${id}`);
  return res.data;
};

// UPDATE DOCUMENT (content + optional title)
export const updateDocument = async (id, data) => {
  const res = await api.put(`/documents/${id}`, data);
  return res.data;
};

// RENAME DOCUMENT
export const renameDocument = async (id, title) => {
  const res = await api.put(`/documents/${id}/rename`, { newTitle: title });
  return res.data;
};

// DUPLICATE DOCUMENT
export const duplicateDocument = async (id) => {
  const res = await api.post(`/documents/${id}/duplicate`);
  return res.data;
};

// DELETE DOCUMENT
export const deleteDocument = async (id) => {
  const res = await api.delete(`/documents/${id}`);
  return res.data;
};

// UPLOAD DOCUMENT (PDF / DOCX / TXT)
export const uploadDocument = async (formData) => {
  const res = await api.post("/documents/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

// EXPORT DOCUMENT (PDF / DOCX / TXT)
export const exportDocument = async (id, { format = "txt", content, title }) => {
  const res = await api.post(
    `/documents/${id}/export`,
    { format, content, title },
    { responseType: "blob" }
  );
  return res.data;
};