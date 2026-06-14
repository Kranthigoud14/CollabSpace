import { create } from "zustand";
import {
  createDocument,
  getMyDocuments,
  getDocumentById,
  updateDocument,
  renameDocument,
  duplicateDocument,
  deleteDocument,
} from "../api/Document.api";

export const useDocumentStore = create((set, get) => ({
  documents: [],
  currentDoc: null,
  loading: false,

  // GET ALL DOCUMENTS (PERSONAL + PROJECT)
  fetchMyDocs: async () => {
    set({ loading: true });

    try {
      const res = await getMyDocuments();

      console.log("RAW DOC RESPONSE:", res);

      // NORMALIZE ALL POSSIBLE SHAPES
      let docs = [];

      if (Array.isArray(res)) {
        docs = res;
      } else if (Array.isArray(res?.documents)) {
        docs = res.documents;
      } else if (Array.isArray(res?.data)) {
        docs = res.data;
      } else if (Array.isArray(res?.data?.documents)) {
        docs = res.data.documents;
      } else {
        docs = [];
      }

      set({ documents: docs, loading: false });
    } catch (err) {
      console.log("fetchMyDocs error:", err);
      set({ documents: [], loading: false });
    }
  },

  // CREATE DOCUMENT
  addDocument: async (data) => {
    try {
      const res = await createDocument(data);
      const newDoc = res?.document || res?.data?.document || res?.data || res;

      if (!newDoc) return res;

      set((state) => ({ documents: [newDoc, ...state.documents] }));

      return newDoc;
    } catch (err) {
      console.log("addDocument error:", err);
    }
  },

  // OPEN DOCUMENT
  openDocument: async (id) => {
    set({ loading: true });

    try {
      const res = await getDocumentById(id);
      const doc = res?.document || res?.data || res || null;

      set({ currentDoc: doc, loading: false });

      return doc;
    } catch (err) {
      console.log("openDocument error:", err);
      set({ loading: false });
    }
  },

  // SAVE DOCUMENT
  saveDocument: async (id, data) => {
    try {
      const res = await updateDocument(id, data);
      const doc = res?.document || res?.data || res || null;

      set({ currentDoc: doc });

      return doc;
    } catch (err) {
      console.log("saveDocument error:", err);
    }
  },

  // RENAME DOCUMENT
  renameDocument: async (id, title) => {
    try {
      const res = await renameDocument(id, title);
      const updated = res?.document || res?.data || res || null;

      set((state) => ({
        documents: state.documents.map((d) =>
          d._id === id ? { ...d, title: updated?.title || title } : d
        ),
      }));

      return updated;
    } catch (err) {
      console.log("renameDocument error:", err);
      throw err;
    }
  },

  // DUPLICATE DOCUMENT
  duplicateDocument: async (id) => {
    try {
      const res = await duplicateDocument(id);
      const newDoc = res?.document || res?.data || res || null;

      if (newDoc) {
        set((state) => ({ documents: [newDoc, ...state.documents] }));
      }

      return newDoc;
    } catch (err) {
      console.log("duplicateDocument error:", err);
      throw err;
    }
  },

  // DELETE DOCUMENT
  removeDocument: async (id) => {
    try {
      await deleteDocument(id);

      set((state) => ({
        documents: state.documents.filter((d) => d._id !== id),
      }));
    } catch (err) {
      console.log("removeDocument error:", err);
      throw err;
    }
  },
}));