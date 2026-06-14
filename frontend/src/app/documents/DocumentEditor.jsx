import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "../layout/AppLayout";
import api from "../../api/axios";
import socketService from "../../services/socket";

import {
  createComment,
  getComments,
  resolveComment,
  deleteComment,
  replyComment,
} from "../../api/comment.api";
import AIAssistant from "../../components/AI/Assistant";
import { pushToast } from "../../components/ui/Toast";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

function DocumentEditor() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [myDocRole, setMyDocRole] = useState("member");
  const [onlineUsers, setOnlineUsers] = useState([]);

  const [comments, setComments] = useState([]);
  const [selectedText, setSelectedText] = useState("");
  const [commentText, setCommentText] = useState("");
  const [activeTab, setActiveTab] = useState("comments"); // 'comments' | 'ai'
  const [replyTexts, setReplyTexts] = useState({});
  const [activeReplyId, setActiveReplyId] = useState(null);

  const [remoteCursors, setRemoteCursors] = useState({});
  const [cursorCoords, setCursorCoords] = useState({});

  const user = JSON.parse(localStorage.getItem("user")) || { name: "Developer" };

  // ---------------- TIPTAP EDITOR ----------------
  const editor = useEditor({
    extensions: [StarterKit],
    content: "",

    onSelectionUpdate: ({ editor }) => {
      const text = editor.state.doc.textBetween(
        editor.state.selection.from,
        editor.state.selection.to
      );
      setSelectedText(text);

      // Emit cursor movement
      const sock = socketService.getSocket();
      if (sock && myDocRole !== "viewer") {
        sock.emit("cursor:move", {
          documentId: id,
          position: { index: editor.state.selection.anchor },
          selection: {
            start: editor.state.selection.from,
            end: editor.state.selection.to,
          },
        });
      }
    },

    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      handleChange(html);
      emitTyping();
    },
  });

  // ---------------- CURSOR POSITION CALCULATION ----------------
  const updateCursorCoords = () => {
    if (!editor || !editor.view) return;
    const coords = {};
    const docLength = editor.state.doc.content.size;
    const editorDom = editor.view.dom;
    const parentRect = editorDom.parentElement.getBoundingClientRect();

    Object.keys(remoteCursors).forEach((userId) => {
      const cursor = remoteCursors[userId];
      try {
        const pos = Math.min(Math.max(0, cursor.position.index), docLength);
        const domCoords = editor.view.coordsAtPos(pos);
        if (domCoords) {
          coords[userId] = {
            top: domCoords.top - parentRect.top,
            left: domCoords.left - parentRect.left,
            name: cursor.name,
            color: cursor.color,
          };
        }
      } catch (e) {
        // Safe check for temporary layout updates
      }
    });
    setCursorCoords(coords);
  };

  // Re-calculate coordinates on cursor / editor changes
  useEffect(() => {
    updateCursorCoords();
  }, [remoteCursors, editor]);

  // Bind to editor events and scroll updates
  useEffect(() => {
    if (!editor) return;

    const handler = () => {
      updateCursorCoords();
    };

    editor.on("update", handler);
    editor.on("selectionUpdate", handler);
    window.addEventListener("resize", handler);

    const editorDom = editor.view.dom;
    editorDom.addEventListener("scroll", handler);

    return () => {
      editor.off("update", handler);
      editor.off("selectionUpdate", handler);
      window.removeEventListener("resize", handler);
      editorDom.removeEventListener("scroll", handler);
    };
  }, [editor, remoteCursors]);

  // Cleanup expired remote cursors after 6 seconds of inactivity
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setRemoteCursors((prev) => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach((key) => {
          if (now - next[key].updatedAt > 6000) {
            delete next[key];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  // ---------------- SOCKET LISTENERS ----------------
  useEffect(() => {
    socketService.connect();
    const sock = socketService.getSocket();

    if (!sock) return;

    // Join document
    sock.emit("join_document", { documentId: id });

    // Handle document sync events
    const handleJoined = ({ documentId, role }) => {
      if (documentId === id) {
        setMyDocRole(role);
        if (role === "viewer") {
          editor?.setEditable(false);
        } else {
          editor?.setEditable(true);
        }
      }
    };

    const handleReceiveChanges = (data) => {
      if (data.documentId === id && editor) {
        const currentHTML = editor.getHTML();
        if (data.content !== currentHTML) {
          // Set content while preserving selection if possible
          const { from, to } = editor.state.selection;
          editor.commands.setContent(data.content, false);
          try {
            editor.commands.setTextSelection({ from, to });
          } catch (e) {}
        }
      }
    };

    const handleOnlineUsers = (users) => {
      setOnlineUsers(users || []);
    };

    // Real-time comments sync
    const handleNewComment = (payload) => {
      if (payload.document === id) {
        setComments((prev) => {
          if (prev.some((c) => c._id === payload._id)) return prev;
          return [payload, ...prev];
        });
      }
    };

    const handleResolvedComment = (payload) => {
      setComments((prev) =>
        prev.map((c) => (c._id === payload._id ? payload : c))
      );
    };

    const handleDeletedComment = (commentId) => {
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    };

    const handleCursorUpdate = (data) => {
      if (data.documentId === id && data.userId !== user._id && data.userId !== user.id) {
        setRemoteCursors((prev) => ({
          ...prev,
          [data.userId]: {
            name: data.name,
            color: data.color,
            position: data.position,
            selection: data.selection,
            updatedAt: Date.now(),
          },
        }));
      }
    };

    sock.on("joined_document", handleJoined);
    sock.on("joined-document", handleJoined);
    sock.on("receive_changes", handleReceiveChanges);
    sock.on("receive-changes", handleReceiveChanges);
    sock.on("document:users", handleOnlineUsers);

    sock.on("comment:new", handleNewComment);
    sock.on("comment:resolved", handleResolvedComment);
    sock.on("comment:deleted", handleDeletedComment);
    sock.on("cursor:update", handleCursorUpdate);

    return () => {
      sock.emit("leave_document", { documentId: id });
      sock.off("joined_document", handleJoined);
      sock.off("joined-document", handleJoined);
      sock.off("receive_changes", handleReceiveChanges);
      sock.off("receive-changes", handleReceiveChanges);
      sock.off("document:users", handleOnlineUsers);
      sock.off("comment:new", handleNewComment);
      sock.off("comment:resolved", handleResolvedComment);
      sock.off("comment:deleted", handleDeletedComment);
      sock.off("cursor:update", handleCursorUpdate);
    };
  }, [id, editor]);

  // ---------------- LOAD DOCUMENT & COMMENTS ----------------
  useEffect(() => {
    loadDocument();
    loadComments();
  }, [id]);

  // ---------------- TYPING INDICATOR ----------------
  const [otherTypers, setOtherTypers] = useState([]);
  useEffect(() => {
    const sock = socketService.getSocket();
    if (!sock) return;

    const onUserTyping = (payload) => {
      if (payload.documentId !== id) return;
      const name = payload.user || "Someone";
      if (name === user.name) return;

      setOtherTypers((prev) => {
        if (prev.includes(name)) return prev;
        return [...prev, name];
      });

      // Clear typing indicator after 2.5s of inactivity
      setTimeout(() => {
        setOtherTypers((prev) => prev.filter((p) => p !== name));
      }, 2500);
    };

    sock.on("user:typing", onUserTyping);
    return () => {
      sock.off("user:typing", onUserTyping);
    };
  }, [id, user.name]);

  // AI suggestion Tab completion logic
  const [ghostSuggestion, setGhostSuggestion] = useState("");
  useEffect(() => {
    const handler = (e) => setGhostSuggestion(e?.detail || "");
    const clear = () => setGhostSuggestion("");
    window.addEventListener("ai:suggestion", handler);
    window.addEventListener("ai:suggestion-clear", clear);
    return () => {
      window.removeEventListener("ai:suggestion", handler);
      window.removeEventListener("ai:suggestion-clear", clear);
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Tab" && ghostSuggestion) {
        e.preventDefault();
        editor?.commands.insertContent(" " + ghostSuggestion);
        setGhostSuggestion("");
        window.dispatchEvent(new CustomEvent("ai:suggestion-clear"));
        pushToast("Inserted AI autocomplete text");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ghostSuggestion, editor]);

  const loadDocument = async () => {
    try {
      const res = await api.get(`/documents/${id}`);
      const doc = res.data?.document || res.data || res || {};
      setTitle(doc?.title || "Untitled Document");
      editor?.commands.setContent(doc?.content || "");
    } catch (err) {
      console.error("Load document error:", err);
    }
  };

  const loadComments = async () => {
    try {
      const res = await getComments(id);
      setComments(res.data?.comments || res?.comments || []);
    } catch (err) {
      console.error("Load comments error:", err);
    }
  };

  // ---------------- CHANGE & AUTOSAVE ----------------
  const handleChange = (content) => {
    if (myDocRole === "viewer") return;

    const sock = socketService.getSocket();
    if (sock) {
      sock.emit("send_changes", { documentId: id, content });
    }

    autoSave(content);
  };

  const autoSave = (content) => {
    clearTimeout(window.saveTimer);
    setSaving(true);

    window.saveTimer = setTimeout(async () => {
      try {
        await api.put(`/documents/${id}`, {
          title,
          content,
        });
        setSaving(false);
      } catch (err) {
        console.error(err);
        setSaving(false);
      }
    }, 1200);
  };

  const handleTitleBlur = () => {
    if (myDocRole !== "viewer") {
      autoSave(editor?.getHTML());
    }
  };

  // ---------------- TYPING BROADCAST ----------------
  let typingTimer = null;
  const emitTyping = () => {
    const sock = socketService.getSocket();
    if (!sock || myDocRole === "viewer") return;

    sock.emit("user:typing", { documentId: id });

    if (typingTimer) clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      const s = socketService.getSocket();
      if (s) s.emit("user:stop-typing", { documentId: id });
    }, 1500);
  };

  // ---------------- COMMENTS ACTIONS ----------------
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || myDocRole === "viewer") return;

    try {
      const res = await createComment({
        document: id,
        text: commentText.trim(),
      });
      setCommentText("");
      setSelectedText("");
      // Real-time event will update the list, but we update locally as fallback
      if (res?.data?.comment) {
        setComments((prev) => {
          if (prev.some((c) => c._id === res.data.comment._id)) return prev;
          return [res.data.comment, ...prev];
        });
      }
    } catch (err) {
      console.error("Add comment error:", err);
    }
  };

  const handleResolveComment = async (commentId, isResolved) => {
    if (myDocRole === "viewer") return;
    try {
      await resolveComment(commentId);
      setComments((prev) =>
        prev.map((c) => (c._id === commentId ? { ...c, resolved: !isResolved } : c))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostReply = async (commentId) => {
    const text = replyTexts[commentId];
    if (!text || !text.trim() || myDocRole === "viewer") return;

    try {
      const res = await replyComment(commentId, text.trim());
      setReplyTexts((prev) => ({ ...prev, [commentId]: "" }));
      setActiveReplyId(null);
      const updatedComment = res?.data?.comment || res?.comment;
      if (updatedComment) {
        setComments((prev) =>
          prev.map((c) => (c._id === commentId ? updatedComment : c))
        );
      }
    } catch (err) {
      console.error("Reply comment error:", err);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    } catch (err) {
      console.error("Delete comment error:", err);
    }
  };

  const isViewer = myDocRole === "viewer";

  return (
    <AppLayout>
      <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto h-full">
        {/* LEFT COLUMN: EDITOR AREA (flex-1) */}
        <div className="flex-1 bg-slate-950/20 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-850 pb-4">
            <div className="flex-1">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                disabled={isViewer}
                className="text-2xl font-extrabold bg-transparent text-white outline-none w-full border-b border-transparent focus:border-slate-800 transition-all placeholder-slate-500"
                placeholder="Untitled Document"
              />
              {/* Online indicator list */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mr-2">
                  Active Editors:
                </span>
                {onlineUsers.map((u, i) => (
                  <span
                    key={u.userId || i}
                    className="text-[9px] font-bold text-slate-350 px-2 py-0.5 rounded bg-slate-900 border border-slate-800"
                  >
                    {u.name} {u.name === user.name && "(You)"}
                  </span>
                ))}
              </div>
            </div>

            {/* Save Status & Typing Indicators */}
            <div className="flex flex-col items-start sm:items-end justify-center">
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-400">
                {saving ? "⏳ Saving changes..." : "✓ Saved"}
              </span>
              
              {otherTypers.length > 0 && (
                <span className="text-[10px] text-indigo-400 font-medium italic mt-2 animate-pulse">
                  ✍️ {otherTypers.join(", ")} {otherTypers.length === 1 ? "is" : "are"} typing...
                </span>
              )}
            </div>
          </div>

          {/* EDITOR AREA */}
          <div className="flex-1 min-h-[50vh] prose prose-invert max-w-none text-slate-200 outline-none pt-4 relative">
            {editor ? (
              <div className="relative">
                <EditorContent
                  editor={editor}
                  className="min-h-[50vh] focus:outline-none select-text border-0"
                />
                {/* Collaborative Cursors Overlay */}
                {Object.keys(cursorCoords).map((userId) => {
                  const cc = cursorCoords[userId];
                  return (
                    <div
                      key={userId}
                      className="absolute pointer-events-none transition-all duration-150 z-20"
                      style={{
                        top: `${cc.top}px`,
                        left: `${cc.left}px`,
                        height: "1.25rem",
                      }}
                    >
                      {/* Vertical line indicator */}
                      <div
                        className="w-0.5 h-full animate-pulse"
                        style={{ backgroundColor: cc.color }}
                      />
                      {/* Floating user name tag */}
                      <div
                        className="absolute bottom-full left-0 px-1.5 py-0.5 text-[8px] font-bold text-white rounded whitespace-nowrap opacity-90 transition-opacity duration-200"
                        style={{
                          backgroundColor: cc.color,
                          transform: "translateY(-2px)",
                        }}
                      >
                        {cc.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-44 bg-slate-900/60 rounded-xl animate-pulse" />
            )}
          </div>
          
          {/* Ghost Suggestion footer */}
          {ghostSuggestion && (
            <div className="p-3 bg-violet-500/5 border border-violet-500/10 rounded-xl text-xs text-slate-400 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-300">
              <span className="truncate">
                💡 <span className="font-semibold text-slate-300">AI autocomplete suggestion:</span>{" "}
                <span className="italic">"{ghostSuggestion}"</span>
              </span>
              <span className="text-[10px] bg-violet-600 text-white font-bold px-2 py-0.5 rounded ml-2 whitespace-nowrap">
                Press [Tab] to accept
              </span>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: COLLABORATIVE PANEL (w-80) */}
        <div className="w-full lg:w-80 flex flex-col bg-slate-950/40 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden h-[600px]">
          {/* Tab Selector */}
          <div className="flex border-b border-slate-800 bg-slate-950/40">
            <button
              onClick={() => setActiveTab("comments")}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                activeTab === "comments"
                  ? "border-indigo-500 text-white bg-indigo-500/[0.02]"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              💬 Comments
            </button>
            <button
              onClick={() => setActiveTab("ai")}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                activeTab === "ai"
                  ? "border-indigo-500 text-white bg-indigo-500/[0.02]"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              🔮 AI Assistant
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 flex flex-col justify-between">
            {activeTab === "comments" ? (
              /* COMMENTS PANEL */
              <div className="flex flex-col justify-between h-full space-y-4">
                <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                  {comments.length === 0 ? (
                    <div className="py-16 text-center text-slate-650 text-xs border border-dashed border-slate-850 rounded-xl">
                      No discussions yet
                    </div>
                  ) : (
                    comments.map((c) => (
                      <div
                        key={c._id}
                        className={`p-3 rounded-xl border transition-all duration-200 ${
                          c.resolved
                            ? "bg-slate-900/20 border-slate-900/60 opacity-60"
                            : "bg-slate-900/60 border-slate-850"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-indigo-400">
                            {c.user?.name || "Anonymous"}
                          </span>
                          <span className="text-[8px] text-slate-500">
                            {new Date(c.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        
                        <p className={`text-slate-300 text-xs mt-1.5 leading-relaxed break-words ${c.resolved ? 'line-through' : ''}`}>
                          {c.text}
                        </p>

                        {/* Nested replies */}
                        {c.replies && c.replies.length > 0 && (
                          <div className="mt-2.5 pl-3 border-l border-slate-800 space-y-2">
                            {c.replies.map((reply, ri) => (
                              <div key={reply._id || ri} className="text-[11px] leading-relaxed">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-400">{reply.user?.name || "Anonymous"}</span>
                                  <span className="text-[8px] text-slate-650">{new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p className="text-slate-300 break-words">{reply.text}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Actions & Reply Form */}
                        {!isViewer && (
                          <div className="mt-2.5 pt-2 border-t border-slate-850/40">
                            {activeReplyId === c._id ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  placeholder="Write a reply..."
                                  value={replyTexts[c._id] || ""}
                                  onChange={(e) => setReplyTexts(prev => ({ ...prev, [c._id]: e.target.value }))}
                                  className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-white placeholder-slate-600 outline-none focus:border-indigo-500 transition-all"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handlePostReply(c._id);
                                    if (e.key === "Escape") setActiveReplyId(null);
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handlePostReply(c._id)}
                                  className="px-2 py-1 bg-indigo-650 text-white font-bold text-[10px] rounded hover:bg-indigo-600"
                                >
                                  Send
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActiveReplyId(null)}
                                  className="text-[10px] text-slate-500 hover:text-slate-350"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                {!c.resolved ? (
                                  <button
                                    type="button"
                                    onClick={() => setActiveReplyId(c._id)}
                                    className="text-[9px] font-bold text-indigo-405 hover:text-indigo-400 transition-colors"
                                  >
                                    ↳ Reply
                                  </button>
                                ) : <div />}
                                <div className="flex gap-2">
                                  {(c.user?._id === user._id || c.user === user._id || myDocRole === "owner" || myDocRole === "admin") && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteComment(c._id)}
                                      className="text-[9px] font-bold text-red-500 hover:text-red-400"
                                    >
                                      Delete
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleResolveComment(c._id, c.resolved)}
                                    className="text-[9px] font-bold text-slate-500 hover:text-indigo-400 transition-colors"
                                  >
                                    {c.resolved ? "Reopen thread" : "✓ Resolve"}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Comment Creator Input Form */}
                {!isViewer && (
                  <form onSubmit={handleAddComment} className="pt-3 border-t border-slate-850 space-y-2">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Comment on document..."
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-white placeholder-slate-500 text-xs h-16 outline-none focus:border-indigo-500 transition-all resize-none"
                    />
                    <button
                      type="submit"
                      disabled={!commentText.trim()}
                      className="w-full py-2 bg-indigo-650 hover:bg-indigo-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all"
                    >
                      Post Comment
                    </button>
                  </form>
                )}
              </div>
            ) : (
              /* AI ASSISTANT PANEL */
              <AIAssistant
                documentContent={editor?.getHTML() || ""}
                selectedText={selectedText}
                onAccept={(text) => {
                  editor?.commands.insertContent(text);
                  pushToast("Inserted AI generated text");
                }}
              />
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default DocumentEditor;