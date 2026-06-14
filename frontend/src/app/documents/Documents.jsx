import { useEffect, useState, useRef } from "react";
import AppLayout from "../layout/AppLayout";
import { useDocumentStore } from "../../store/document.store";
import { useAuthStore } from "../../store/auth.store";
import { useNavigate } from "react-router-dom";

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
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/60 rounded-2xl p-7 shadow-2xl shadow-black/60">
        {/* Icon */}
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 mx-auto mb-5">
          <svg
            className="w-7 h-7 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
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
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-semibold hover:border-slate-500 hover:text-white transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-900/30"
          >
            {deleting ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Deleting...
              </>
            ) : (
              "Delete"
            )}
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
            onClick={onCancel}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-sm font-semibold hover:border-slate-500 hover:text-white transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => title.trim() && onConfirm(title.trim())}
            disabled={saving || !title.trim()}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
          >
            {saving ? "Saving..." : "Rename"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Three-dot action menu
───────────────────────────────────────────── */
function DocMenu({ doc, onOpen, onRename, onDuplicate, onDelete, isOwner }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const menuItems = [
    {
      label: "Open Editor",
      icon: "↗",
      onClick: onOpen,
      className: "text-slate-200 hover:text-white hover:bg-slate-800",
    },
    {
      label: "Rename",
      icon: "✏️",
      onClick: onRename,
      show: isOwner,
      className: "text-slate-200 hover:text-white hover:bg-slate-800",
    },
    {
      label: "Duplicate",
      icon: "📋",
      onClick: onDuplicate,
      show: isOwner,
      className: "text-slate-200 hover:text-white hover:bg-slate-800",
    },
    {
      label: "Delete",
      icon: "🗑️",
      onClick: onDelete,
      show: isOwner,
      className: "text-red-400 hover:text-red-300 hover:bg-red-500/10",
      separator: true,
    },
  ];

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all text-lg font-bold leading-none"
        title="More actions"
      >
        ⋮
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-44 bg-slate-900 border border-slate-700/60 rounded-xl shadow-2xl shadow-black/60 overflow-hidden py-1">
          {menuItems
            .filter((m) => m.show !== false)
            .map((item) => (
              <div key={item.label}>
                {item.separator && (
                  <div className="my-1 border-t border-slate-800" />
                )}
                <button
                  onClick={() => {
                    item.onClick();
                    setOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-all ${item.className}`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Document Card
───────────────────────────────────────────── */
function DocCard({
  doc,
  currentUserId,
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
}) {
  const isOwner =
    doc?.createdBy?._id === currentUserId ||
    doc?.createdBy === currentUserId;

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
      className="group relative bg-gradient-to-br from-slate-900/70 to-slate-950/80 backdrop-blur-md border border-slate-800/70 rounded-2xl p-5 hover:border-indigo-500/30 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[200px]"
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
                {projectName}
              </span>
            ) : (
              <span className="text-[9px] text-slate-500 font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700/50 uppercase tracking-wider">
                Personal
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
          isOwner={isOwner}
          onOpen={onOpen}
          onRename={onRename}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      </div>

      {/* Preview */}
      <p className="text-slate-500 text-xs mt-3 leading-relaxed line-clamp-2 flex-1">
        {preview}
      </p>

      {/* Meta row */}
      <div className="mt-4 pt-3 border-t border-slate-800/60 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 text-[10px]">
            🕒 Updated {timeAgo(doc?.updatedAt || doc?.createdAt)}
          </span>
          <span className="text-slate-600 text-[10px]">
            {words} {words === 1 ? "word" : "words"}
          </span>
        </div>
        {creatorName && (
          <div className="text-slate-600 text-[10px]">
            By{" "}
            <span className="text-slate-400 font-medium">{creatorName}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Skeleton Loader
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
   Toast Notification (inline, lightweight)
───────────────────────────────────────────── */
function useToast() {
  const [toast, setToast] = useState(null);

  const show = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const Toast = toast ? (
    <div
      className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-xl border shadow-2xl text-sm font-semibold transition-all animate-fade-in ${
        toast.type === "success"
          ? "bg-emerald-900/80 border-emerald-500/30 text-emerald-300"
          : "bg-red-900/80 border-red-500/30 text-red-300"
      }`}
    >
      <span>{toast.type === "success" ? "✓" : "✕"}</span>
      {toast.message}
    </div>
  ) : null;

  return { show, Toast };
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

  const [searchQuery, setSearchQuery] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState("all"); // "all" | "personal" | "project"

  // Modals
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renaming, setRenaming] = useState(false);

  const { show: showToast, Toast } = useToast();

  useEffect(() => {
    fetchMyDocs();
  }, []);

  /* ── Create ── */
  const handleCreateDoc = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setCreating(true);
      const res = await addDocument({ title: newTitle.trim(), content: "", project: null });
      setNewTitle("");
      const doc = res?.document || res?.data || res || null;
      if (doc?._id) navigate(`/app/documents/${doc._id}`);
      fetchMyDocs();
    } catch (err) {
      console.error("Create doc error:", err);
      showToast("Failed to create document", "error");
    } finally {
      setCreating(false);
    }
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await removeDocument(deleteTarget._id);
      showToast(`"${deleteTarget.title}" deleted`);
      setDeleteTarget(null);
    } catch {
      showToast("Failed to delete document", "error");
    } finally {
      setDeleting(false);
    }
  };

  /* ── Rename ── */
  const handleRename = async (newName) => {
    if (!renameTarget) return;
    try {
      setRenaming(true);
      await renameDocument(renameTarget._id, newName);
      showToast("Document renamed");
      setRenameTarget(null);
    } catch {
      showToast("Failed to rename document", "error");
    } finally {
      setRenaming(false);
    }
  };

  /* ── Duplicate ── */
  const handleDuplicate = async (doc) => {
    try {
      await duplicateDocument(doc._id);
      showToast(`Duplicated "${doc.title}"`);
      fetchMyDocs();
    } catch {
      showToast("Failed to duplicate document", "error");
    }
  };

  /* ── Filter ── */
  const filtered = (documents || []).filter((doc) => {
    const matchSearch = (doc?.title || "Untitled")
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchSearch && !doc?.project;
  });

  const sortedDocs = [...filtered].sort(
    (a, b) =>
      new Date(b.updatedAt || b.createdAt) -
      new Date(a.updatedAt || a.createdAt)
  );

  const personalCount = (documents || []).filter((d) => !d?.project).length;
  const projectCount = (documents || []).filter((d) => !!d?.project).length;

  return (
    <AppLayout>
      <div className="space-y-7 max-w-7xl mx-auto">
        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Personal Documents
            </h1>
            <p className="text-slate-400 mt-1 text-sm font-medium">
              {personalCount} document{personalCount !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Create form */}
          <form
            onSubmit={handleCreateDoc}
            className="flex gap-2 w-full md:w-auto"
          >
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="New document title..."
              className="flex-1 md:w-56 px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-white placeholder-slate-500 text-sm outline-none focus:border-indigo-500 transition-all"
            />
            <button
              type="submit"
              disabled={creating || !newTitle.trim()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all whitespace-nowrap flex items-center gap-2"
            >
              {creating ? (
                <>
                  <svg
                    className="w-3.5 h-3.5 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  Creating...
                </>
              ) : (
                <>+ Create</>
              )}
            </button>
          </form>
        </div>

        {/* ── Search Bar ── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search personal documents..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/50 border border-slate-800 text-white placeholder-slate-500 text-sm outline-none focus:border-indigo-500 transition-all"
            />
            <span className="absolute left-3.5 top-2.5 text-slate-500 text-sm">
              🔍
            </span>
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
          <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-slate-800 rounded-2xl">
            <div className="text-6xl mb-4">📄</div>
            <h3 className="text-xl font-bold text-slate-300 mb-2">
              No documents found
            </h3>
            <p className="text-slate-500 text-sm max-w-xs">
              {searchQuery
                ? "No documents match your search. Try a different keyword."
                : filter !== "all"
                ? `No ${filter} documents yet.`
                : "Create your first document to get started."}
            </p>
            {!searchQuery && filter === "all" && (
              <button
                onClick={() => document.querySelector("input[placeholder='New document title...']")?.focus()}
                className="mt-6 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all"
              >
                + Create Document
              </button>
            )}
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

      {/* ── Toast ── */}
      {Toast}
    </AppLayout>
  );
}

export default Documents;