import { useEffect, useState, useRef } from "react";
import AppLayout from "../layout/AppLayout";
import { useDocumentStore } from "../../store/document.store";
import { useProjectStore } from "../../store/project.store";
import { useAuthStore } from "../../store/auth.store";
import { useNavigate } from "react-router-dom";
import UploadDocumentModal from "../../components/UploadDocumentModal";
import { exportDocument } from "../../api/Document.api";
import { pushToast } from "../../components/ui/Toast";

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function timeAgo(date) {
  if (!date) return "—";
  const secs = Math.floor((Date.now() - new Date(date)) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)} min ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function wordCount(html) {
  if (!html) return 0;
  return html
    .replace(/<[^>]*>/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/* ─────────────────────────────────────────────
   Delete Confirmation Modal
───────────────────────────────────────────── */
function DeleteModal({ doc, onCancel, onConfirm, deleting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative z-10 w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/60 rounded-2xl p-7 shadow-2xl shadow-black/60">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 mx-auto mb-5">
          <span className="text-2xl">🗑️</span>
        </div>

        <h2 className="text-xl font-bold text-white text-center">
          Delete Document?
        </h2>
        <p className="mt-3 text-slate-400 text-sm text-center leading-relaxed">
          Are you sure you want to permanently delete{" "}
          <span className="text-white font-semibold">
            &quot;{doc?.title || "Untitled"}&quot;
          </span>
          ?{" "}
          <br />
          <span className="text-red-400 font-medium">
            This action cannot be undone.
          </span>
        </p>

        <div className="mt-7 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-semibold hover:border-slate-500 hover:text-white transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-900/30 cursor-pointer"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Rename Modal
───────────────────────────────────────────── */
function RenameModal({ doc, onCancel, onConfirm, saving }) {
  const [title, setTitle] = useState(doc?.title || "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative z-10 w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/60 rounded-2xl p-7 shadow-2xl shadow-black/60">
        <h2 className="text-lg font-bold text-white mb-5">Rename Document</h2>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && title.trim()) onConfirm(title.trim());
            if (e.key === "Escape") onCancel();
          }}
          placeholder="Document title..."
          className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm outline-none focus:border-indigo-500 transition-all"
        />
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-semibold hover:border-slate-500 hover:text-white transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => title.trim() && onConfirm(title.trim())}
            disabled={saving || !title.trim()}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {saving ? "Saving..." : "Rename"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Three-dot action menu with Export
───────────────────────────────────────────── */
function DocMenu({ doc, onOpen, onRename, onDuplicate, onDelete, onExport, canManage }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all text-lg font-bold leading-none cursor-pointer"
        title="Document options"
      >
        ⋮
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-48 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl shadow-black/80 overflow-hidden py-1">
          <button
            type="button"
            onClick={() => {
              onOpen();
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer"
          >
            <span>↗</span> Open Editor
          </button>

          {canManage && (
            <button
              type="button"
              onClick={() => {
                onRename();
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer"
            >
              <span>✏️</span> Rename
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onDuplicate();
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer"
          >
            <span>📋</span> Duplicate
          </button>

          {/* Export Submenu Options */}
          <div className="my-1 border-t border-slate-800" />
          <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Export As
          </div>
          <button
            type="button"
            onClick={() => {
              onExport("pdf");
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
          >
            <span>📄</span> PDF (.pdf)
          </button>
          <button
            type="button"
            onClick={() => {
              onExport("docx");
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
          >
            <span>📝</span> Word (.docx)
          </button>
          <button
            type="button"
            onClick={() => {
              onExport("txt");
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
          >
            <span>🗒️</span> Plain Text (.txt)
          </button>

          {canManage && (
            <>
              <div className="my-1 border-t border-slate-800" />
              <button
                type="button"
                onClick={() => {
                  onDelete();
                  setOpen(false);
                }}
                className="w-full text-left px-4 py-2.5 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-2.5 cursor-pointer"
              >
                <span>🗑️</span> Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Document Card Component
───────────────────────────────────────────── */
function DocCard({
  doc,
  currentUserId,
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
  onExport,
}) {
  const isPersonal = !doc?.project;
  const isOwner =
    doc?.createdBy?._id?.toString() === currentUserId?.toString() ||
    doc?.createdBy?.toString() === currentUserId?.toString();

  const preview = doc?.content
    ? doc.content.replace(/<[^>]*>/g, " ").slice(0, 120)
    : "Empty document — click to start writing.";

  const words = wordCount(doc?.content);
  const projectName =
    typeof doc?.project === "object" ? doc?.project?.name : null;
  const creatorName =
    typeof doc?.createdBy === "object" ? doc?.createdBy?.name : null;

  return (
    <div
      className="group relative bg-gradient-to-br from-slate-900/70 to-slate-950/80 backdrop-blur-md border border-slate-800/70 rounded-2xl p-5 hover:border-indigo-500/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[200px]"
      onClick={() => onOpen()}
    >
      {/* Top row: title + menu */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-bold text-base truncate group-hover:text-indigo-400 transition-colors leading-snug">
            {doc?.title || "Untitled Document"}
          </h3>
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {projectName ? (
              <span className="text-[9px] text-violet-400 font-bold px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 uppercase tracking-wider">
                📁 Project: {projectName}
              </span>
            ) : (
              <span className="text-[9px] text-slate-400 font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700/60 uppercase tracking-wider">
                👤 Personal
              </span>
            )}
            {isOwner && (
              <span className="text-[9px] text-indigo-400 font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 uppercase tracking-wider">
                Owner
              </span>
            )}
          </div>
        </div>

        <DocMenu
          doc={doc}
          canManage={isPersonal ? isOwner : true}
          onOpen={onOpen}
          onRename={onRename}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onExport={onExport}
        />
      </div>

      {/* Content Preview */}
      <p className="text-slate-400 text-xs mt-3 leading-relaxed line-clamp-2 flex-1">
        {preview}
      </p>

      {/* Metadata */}
      <div className="mt-4 pt-3 border-t border-slate-800/60 space-y-1">
        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <span>🕒 {timeAgo(doc?.updatedAt || doc?.createdAt)}</span>
          <span>{words} {words === 1 ? "word" : "words"}</span>
        </div>
        {creatorName && !isPersonal && (
          <div className="text-slate-500 text-[10px]">
            Created by: <span className="text-slate-400 font-medium">{creatorName}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Skeleton Card
───────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 animate-pulse min-h-[200px] flex flex-col justify-between">
      <div>
        <div className="h-4 bg-slate-800 rounded-lg w-3/4 mb-2" />
        <div className="h-3 bg-slate-800 rounded w-1/3 mb-4" />
        <div className="h-3 bg-slate-800/60 rounded w-full mb-1.5" />
        <div className="h-3 bg-slate-800/60 rounded w-5/6" />
      </div>
      <div className="border-t border-slate-800 pt-3 flex justify-between">
        <div className="h-3 bg-slate-800 rounded w-24" />
        <div className="h-3 bg-slate-800 rounded w-16" />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Documents Page
───────────────────────────────────────────── */
function Documents() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const safeUser = user || JSON.parse(localStorage.getItem("user")) || {};
  const currentUserId = safeUser?._id;

  const {
    documents,
    fetchMyDocs,
    addDocument,
    renameDocument,
    duplicateDocument,
    removeDocument,
    loading,
  } = useDocumentStore();

  const { projects, fetchProjects } = useProjectStore();

  const [activeTab, setActiveTab] = useState("personal"); // "personal" | "project"
  const [selectedProjectId, setSelectedProjectId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  // Modals
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renaming, setRenaming] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    fetchMyDocs();
    fetchProjects();
  }, []);

  const personalDocs = (documents || []).filter((d) => !d?.project);
  const projectDocs = (documents || []).filter((d) => !!d?.project);

  /* ── Filtered list according to tab and search ── */
  const currentList = activeTab === "personal" ? personalDocs : projectDocs;

  const filteredDocs = currentList.filter((doc) => {
    // Project filter if on project tab
    if (activeTab === "project" && selectedProjectId !== "all") {
      const pId = typeof doc?.project === "string" ? doc.project : doc?.project?._id;
      if (pId !== selectedProjectId) return false;
    }
    // Search query
    const matchSearch = (doc?.title || "Untitled")
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchSearch;
  });

  const sortedDocs = [...filteredDocs].sort(
    (a, b) =>
      new Date(b.updatedAt || b.createdAt) -
      new Date(a.updatedAt || a.createdAt)
  );

  /* ── Create Document Handler ── */
  const handleCreateDoc = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setCreating(true);
      const targetProject =
        activeTab === "project" && selectedProjectId !== "all"
          ? selectedProjectId
          : activeTab === "project" && projects.length > 0
          ? projects[0]._id
          : null;

      const res = await addDocument({
        title: newTitle.trim(),
        content: "",
        project: targetProject,
      });

      setNewTitle("");
      const doc = res?.document || res?.data || res || null;
      pushToast("Document created successfully ✓");
      if (doc?._id) {
        navigate(`/app/documents/${doc._id}`);
      }
      fetchMyDocs();
    } catch (err) {
      console.error("Create doc error:", err);
      pushToast(err?.response?.data?.message || "Failed to create document.");
    } finally {
      setCreating(false);
    }
  };

  /* ── Delete Document Handler ── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await removeDocument(deleteTarget._id);
      pushToast(`"${deleteTarget.title}" deleted ✓`);
      setDeleteTarget(null);
    } catch (err) {
      console.error("Delete doc error:", err);
      pushToast(err?.response?.data?.message || "Failed to delete document.");
    } finally {
      setDeleting(false);
    }
  };

  /* ── Rename Document Handler ── */
  const handleRename = async (newName) => {
    if (!renameTarget) return;
    try {
      setRenaming(true);
      await renameDocument(renameTarget._id, newName);
      pushToast("Document renamed successfully ✓");
      setRenameTarget(null);
    } catch (err) {
      console.error("Rename doc error:", err);
      pushToast(err?.response?.data?.message || "Failed to rename document.");
    } finally {
      setRenaming(false);
    }
  };

  /* ── Duplicate Document Handler ── */
  const handleDuplicate = async (doc) => {
    try {
      await duplicateDocument(doc._id);
      pushToast(`Duplicated "${doc.title}" ✓`);
      fetchMyDocs();
    } catch (err) {
      console.error("Duplicate doc error:", err);
      pushToast(err?.response?.data?.message || "Failed to duplicate document.");
    }
  };

  /* ── Export Document Handler ── */
  const handleExport = async (doc, format) => {
    try {
      pushToast(`Preparing ${format.toUpperCase()} export for "${doc.title}"...`);
      const blob = await exportDocument(doc._id, {
        format,
        content: doc.content || "",
        title: doc.title || "Document",
      });

      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${doc.title || "document"}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      pushToast(`Export complete: ${doc.title}.${format} ✓`);
    } catch (err) {
      console.error("Export error:", err);
      pushToast(err?.response?.data?.message || "Failed to export document.");
    }
  };

  const uploadProjectId =
    activeTab === "project"
      ? selectedProjectId !== "all"
        ? selectedProjectId
        : projects?.[0]?._id || null
      : null;

  const uploadProjectName =
    activeTab === "project"
      ? projects.find((p) => p._id === uploadProjectId)?.name
      : null;

  return (
    <AppLayout>
      <div className="space-y-7 max-w-7xl mx-auto">
        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Documents
            </h1>
            <p className="text-slate-400 mt-1 text-sm font-medium">
              Create, edit, extract, and export your personal and project documents.
            </p>
          </div>

          {/* Create form & Upload action */}
          <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
            <form
              onSubmit={handleCreateDoc}
              className="flex gap-2 w-full sm:w-auto"
            >
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={
                  activeTab === "personal"
                    ? "New personal document..."
                    : "New project document..."
                }
                className="flex-1 sm:w-56 px-4 py-2.5 rounded-xl bg-slate-900/70 border border-slate-800 text-white placeholder-slate-500 text-sm outline-none focus:border-indigo-500 transition-all"
              />
              <button
                type="submit"
                disabled={creating || !newTitle.trim()}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-900/30"
              >
                {creating ? "Creating..." : "+ Create"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-sm font-semibold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer"
            >
              <span>📄</span> Upload / Extract
            </button>
          </div>
        </div>

        {/* ── Tab Switcher: Personal vs Project ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2 p-1 bg-slate-950/60 border border-slate-800/90 rounded-2xl w-fit">
            <button
              type="button"
              onClick={() => setActiveTab("personal")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "personal"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>👤</span> Personal Documents ({personalDocs.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("project")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "project"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>📁</span> Project Documents ({projectDocs.length})
            </button>
          </div>

          {/* Search bar & Project filter */}
          <div className="flex items-center gap-2.5 flex-1 max-w-md">
            {activeTab === "project" && projects.length > 0 && (
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="px-3 py-2 bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="all">All Projects</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}

            <div className="relative flex-1">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${activeTab} documents...`}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-white placeholder-slate-500 text-xs outline-none focus:border-indigo-500 transition-all"
              />
              <span className="absolute left-3 top-2.5 text-slate-500 text-xs">
                🔍
              </span>
            </div>
          </div>
        </div>

        {/* ── Documents Grid ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <SkeletonCard key={n} />
            ))}
          </div>
        ) : sortedDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-slate-800/80 rounded-2xl bg-slate-950/20">
            <div className="text-5xl mb-3">📄</div>
            <h3 className="text-lg font-bold text-slate-300 mb-1">
              {searchQuery
                ? "No matching documents found"
                : activeTab === "personal"
                ? "No personal documents yet"
                : "No project documents found"}
            </h3>
            <p className="text-slate-500 text-xs max-w-sm mb-5">
              {searchQuery
                ? "Try searching with a different keyword."
                : activeTab === "personal"
                ? "Create your first personal document or upload a file to extract its content."
                : "Select a project workspace or create a document to collaborate with your team."}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => document.querySelector("input[placeholder*='document...']")?.focus()}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-900/30 cursor-pointer"
              >
                + New Document
              </button>
              <button
                type="button"
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition-all cursor-pointer"
              >
                📄 Upload / Extract
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {sortedDocs.map((doc) => (
              <DocCard
                key={doc._id}
                doc={doc}
                currentUserId={currentUserId}
                onOpen={() => navigate(`/app/documents/${doc._id}`)}
                onRename={() => setRenameTarget(doc)}
                onDuplicate={() => handleDuplicate(doc)}
                onDelete={() => setDeleteTarget(doc)}
                onExport={(fmt) => handleExport(doc, fmt)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {deleteTarget && (
        <DeleteModal
          doc={deleteTarget}
          onCancel={() => !deleting && setDeleteTarget(null)}
          onConfirm={handleDelete}
          deleting={deleting}
        />
      )}

      {renameTarget && (
        <RenameModal
          doc={renameTarget}
          onCancel={() => !renaming && setRenameTarget(null)}
          onConfirm={handleRename}
          saving={renaming}
        />
      )}

      {/* ── Upload & Extract Modal ── */}
      <UploadDocumentModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        projectId={uploadProjectId}
        projectName={uploadProjectName}
        onSuccess={(newDoc) => {
          fetchMyDocs();
          if (newDoc?._id) navigate(`/app/documents/${newDoc._id}`);
        }}
      />
    </AppLayout>
  );
}

export default Documents;