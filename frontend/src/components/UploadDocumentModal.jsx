import { useState, useRef } from "react";
import { uploadDocument, extractDocument } from "../api/Document.api";
import { pushToast } from "./ui/Toast";

export default function UploadDocumentModal({
  isOpen,
  onClose,
  projectId = null,
  projectName = null,
  onSuccess,
  onInsertContent = null,
  onReplaceContent = null,
  isInEditor = false,
}) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState(""); // "uploading" or "extracting"
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [extractedData, setExtractedData] = useState(null); // { title, content, rawText, filename }
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const inputRef = useRef(null);

  if (!isOpen) return null;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    setErrorMsg("");
    setExtractedData(null);
    if (!selectedFile) return;

    const validExtensions = [".pdf", ".docx", ".txt"];
    const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf(".")).toLowerCase();

    if (!validExtensions.includes(ext)) {
      setErrorMsg("Unsupported file format. Please upload a .pdf, .docx, or .txt file.");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setErrorMsg("File exceeds maximum allowed size of 10MB.");
      return;
    }

    setFile(selectedFile);
    const baseName = selectedFile.name.substring(0, selectedFile.name.lastIndexOf("."));
    setTitle(baseName);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  // STEP: Extract Content without auto-saving
  const handleExtract = async () => {
    if (!file) {
      setErrorMsg("Please select a file first.");
      return;
    }

    try {
      setLoading(true);
      setLoadingAction("extracting");
      setErrorMsg("");

      const formData = new FormData();
      formData.append("file", file);

      const res = await extractDocument(formData);
      if (!res?.content && !res?.rawText) {
        throw new Error("No readable text found in this file.");
      }

      setExtractedData({
        title: title.trim() || res.title || "Extracted Document",
        content: res.content || res.rawText || "",
        rawText: res.rawText || "",
        filename: file.name,
      });

      if (!title.trim() && res.title) {
        setTitle(res.title);
      }

      pushToast("Content extracted successfully ✓");
    } catch (err) {
      console.error("Extract error:", err);
      setErrorMsg(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to extract content from file."
      );
    } finally {
      setLoading(false);
      setLoadingAction("");
    }
  };

  // ACTION: Create new document (from uploaded file or extracted content)
  const handleCreateDocument = async (e) => {
    if (e) e.preventDefault();
    if (!file && !extractedData) {
      setErrorMsg("Please select a file or extract content first.");
      return;
    }

    try {
      setLoading(true);
      setLoadingAction("creating");
      setErrorMsg("");

      const formData = new FormData();
      if (file) {
        formData.append("file", file);
      }
      formData.append("title", title.trim() || extractedData?.title || "Untitled Document");
      if (projectId) {
        formData.append("project", projectId);
      }

      const res = await uploadDocument(formData);
      const newDoc = res.document || res.data || res;

      pushToast("Document created successfully ✓");
      handleClose();
      if (onSuccess) {
        onSuccess(newDoc);
      }
    } catch (err) {
      console.error("Create document error:", err);
      setErrorMsg(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to create document."
      );
    } finally {
      setLoading(false);
      setLoadingAction("");
    }
  };

  // ACTION: Insert extracted content into current document editor
  const handleInsert = () => {
    if (!extractedData?.content) return;
    if (onInsertContent) {
      onInsertContent(extractedData.content);
      pushToast("Extracted content inserted at cursor ✓");
      handleClose();
    }
  };

  // ACTION: Replace current document content with extracted content
  const handleConfirmReplace = () => {
    if (!extractedData?.content) return;
    if (onReplaceContent) {
      onReplaceContent(extractedData.content);
      pushToast("Document content replaced with extracted text ✓");
      setShowReplaceConfirm(false);
      handleClose();
    }
  };

  const handleClose = () => {
    setFile(null);
    setTitle("");
    setErrorMsg("");
    setExtractedData(null);
    setShowReplaceConfirm(false);
    onClose();
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getWordCount = (text) => {
    if (!text) return 0;
    return text.replace(/<[^>]*>/g, " ").trim().split(/\s+/).filter(Boolean).length;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
      <div className="relative z-10 w-full max-w-xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/80 rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📄</span>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">
                {extractedData ? "Extracted Content Preview" : "Upload & Extract Document"}
              </h2>
              <p className="text-slate-400 text-xs">
                {projectId
                  ? `Workspace: ${projectName || "Project"}`
                  : "Personal Documents"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="text-slate-400 hover:text-white text-lg font-bold transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-medium shrink-0">
            {errorMsg}
          </div>
        )}

        <div className="overflow-y-auto flex-1 space-y-4 pr-1">
          {!extractedData ? (
            /* STEP 1: UPLOAD & SELECT */
            <>
              {/* Drag and drop zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  dragActive
                    ? "border-indigo-500 bg-indigo-500/10"
                    : file
                    ? "border-emerald-500/50 bg-emerald-500/5"
                    : "border-slate-800 hover:border-slate-700 bg-slate-950/40"
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {file ? (
                  <div className="space-y-2">
                    <div className="text-3xl">✅</div>
                    <div className="text-sm font-bold text-white truncate max-w-sm mx-auto">
                      {file.name}
                    </div>
                    <div className="text-xs text-slate-400">
                      {formatFileSize(file.size)} • Click or drag another file to replace
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-3xl">☁️</div>
                    <div className="text-sm font-semibold text-slate-300">
                      Click to select or drag & drop document
                    </div>
                    <div className="text-xs text-slate-500">
                      Supports <span className="text-slate-400 font-medium">PDF, Word (.docx), and Plain Text (.txt)</span> (Max 10MB)
                    </div>
                  </div>
                )}
              </div>

              {/* Title input */}
              {file && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Document Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter document title..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
              )}
            </>
          ) : (
            /* STEP 2: EXTRACTED CONTENT PREVIEW & ACTIONS */
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span>📁 File: <strong className="text-slate-200">{extractedData.filename}</strong></span>
                <span>📝 ~{getWordCount(extractedData.content)} words</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Document Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Document title..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Extracted Content Preview
                </label>
                <div className="h-44 overflow-y-auto p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                  {extractedData.rawText || extractedData.content.replace(/<[^>]*>/g, " ")}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-slate-800 shrink-0 flex flex-col gap-2">
          {!extractedData ? (
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:border-slate-500 hover:text-white transition-all disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>

              {/* Extract Content First */}
              <button
                type="button"
                onClick={handleExtract}
                disabled={!file || loading}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-900/30"
              >
                {loading && loadingAction === "extracting" ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Extracting Content...
                  </>
                ) : (
                  "🔍 Extract & Preview"
                )}
              </button>

              {/* Direct Quick Upload */}
              <button
                type="button"
                onClick={handleCreateDocument}
                disabled={!file || loading}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer"
              >
                {loading && loadingAction === "creating" ? "Uploading..." : "⚡ Quick Upload"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setExtractedData(null)}
                  disabled={loading}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:text-white transition-all cursor-pointer"
                >
                  ← Back
                </button>

                {isInEditor && onInsertContent && (
                  <button
                    type="button"
                    onClick={handleInsert}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    📥 Insert at Cursor
                  </button>
                )}

                {isInEditor && onReplaceContent && (
                  <button
                    type="button"
                    onClick={() => setShowReplaceConfirm(true)}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    🔄 Replace Document
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCreateDocument}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-900/30 cursor-pointer"
                >
                  {loading ? "Creating..." : "📄 Create as New Document"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Replace Confirmation Modal inside */}
        {showReplaceConfirm && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-2xl flex items-center justify-center p-6 z-20 animate-in fade-in duration-150">
            <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-5 max-w-sm space-y-4 text-center">
              <div className="text-3xl">⚠️</div>
              <h3 className="text-sm font-bold text-white">Replace Document Content?</h3>
              <p className="text-xs text-slate-400">
                This will overwrite the current editor content with the extracted text from{" "}
                <span className="text-white font-medium">{extractedData?.filename}</span>.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowReplaceConfirm(false)}
                  className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReplace}
                  className="flex-1 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all"
                >
                  Confirm Replace
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
