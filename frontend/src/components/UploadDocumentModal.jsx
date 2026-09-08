import { useState, useRef } from "react";
import { uploadDocument } from "../api/Document.api";
import { pushToast } from "./ui/Toast";

export default function UploadDocumentModal({
  isOpen,
  onClose,
  projectId = null,
  onSuccess,
}) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
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
    // Auto-fill title from filename without extension
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

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg("Please select a file to upload.");
      return;
    }

    try {
      setUploading(true);
      setErrorMsg("");

      const formData = new FormData();
      formData.append("file", file);
      if (title.trim()) {
        formData.append("title", title.trim());
      }
      if (projectId) {
        formData.append("project", projectId);
      }

      const res = await uploadDocument(formData);
      const newDoc = res.document || res.data || res;

      pushToast("Document uploaded and converted successfully ✓");
      onClose();
      if (onSuccess) {
        onSuccess(newDoc);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setErrorMsg(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to process and upload document."
      );
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
      <div className="relative z-10 w-full max-w-lg bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/80 rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📄</span>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">
                Upload Document
              </h2>
              <p className="text-slate-400 text-xs">
                Import PDF, DOCX, or TXT into CollabSpace
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="text-slate-400 hover:text-white text-lg font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-4">
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
                  Click to browse or drag & drop file
                </div>
                <div className="text-xs text-slate-500">
                  Supports <span className="text-slate-400 font-medium">PDF, Word (.docx), and Plain Text (.txt)</span> (Max 10MB)
                </div>
              </div>
            )}
          </div>

          {/* Document Title input */}
          {file && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Document Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter title..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm outline-none focus:border-indigo-500 transition-all"
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-semibold hover:border-slate-500 hover:text-white transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!file || uploading}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/30"
            >
              {uploading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Processing...
                </>
              ) : (
                "Upload & Open"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
