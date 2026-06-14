import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "../layout/AppLayout";
import api from "../../api/axios";
import socketService from "../../services/socket";

import {
  getComments,
  resolveComment,
  deleteComment,
  replyComment,
  createComment,
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
  const [activeTab, setActiveTab] = useState("comments");

  const [replyTexts, setReplyTexts] = useState({});
  const [activeReplyId, setActiveReplyId] = useState(null);

  const [remoteCursors, setRemoteCursors] = useState({});
  const [cursorCoords, setCursorCoords] = useState({});

  const [otherTypers, setOtherTypers] = useState([]);
  const [ghostSuggestion, setGhostSuggestion] = useState("");

  const user = JSON.parse(localStorage.getItem("user")) || { name: "Developer" };

  // ---------------- TIPTAP ----------------
  const editor = useEditor({
    extensions: [StarterKit],
    content: "",

    onSelectionUpdate: ({ editor }) => {
      const text = editor.state.doc.textBetween(
        editor.state.selection.from,
        editor.state.selection.to
      );
      setSelectedText(text);

      const sock = socketService.getSocket();
      if (sock && myDocRole !== "viewer") {
        sock.emit("cursor:move", {
          documentId: id,
          position: { index: editor.state.selection.anchor },
        });
      }
    },

    onUpdate: ({ editor }) => {
      const html = editor.getHTML();

      if (myDocRole === "viewer") return;

      const sock = socketService.getSocket();
      sock?.emit("send_changes", {
        documentId: id,
        content: html,
      });

      emitTyping();
    },
  });

  // ---------------- SOCKET ----------------
  useEffect(() => {
    const socket = socketService.connect();
    if (!socket || !id) return;

    socket.emit("join_document", { documentId: id });

    const handleJoined = ({ documentId, role }) => {
      if (documentId !== id) return;
      setMyDocRole(role);
      editor?.setEditable(role !== "viewer");
    };

    const handleChanges = (data) => {
      if (!editor || data.documentId !== id) return;

      const current = editor.getHTML();
      if (data.content !== current) {
        editor.commands.setContent(data.content, false);
      }
    };

    const handleUsers = (users) => setOnlineUsers(users || []);

    const handleCursor = (data) => {
      if (data.documentId !== id) return;

      setRemoteCursors((prev) => ({
        ...prev,
        [data.userId]: {
          name: data.name,
          color: data.color || "#6366f1",
          position: data.position,
          updatedAt: Date.now(),
        },
      }));
    };

    socket.on("joined_document", handleJoined);
    socket.on("receive_changes", handleChanges);
    socket.on("document:users", handleUsers);
    socket.on("cursor:update", handleCursor);

    return () => {
      socket.emit("leave_document", { documentId: id });

      socket.off("joined_document", handleJoined);
      socket.off("receive_changes", handleChanges);
      socket.off("document:users", handleUsers);
      socket.off("cursor:update", handleCursor);
    };
  }, [id, editor]);

  // ---------------- LOAD ----------------
  useEffect(() => {
    loadDocument();
    loadComments();
  }, [id]);

  const loadDocument = async () => {
    try {
      const res = await api.get(`/documents/${id}`);
      const doc = res.data?.document || res.data;
      setTitle(doc?.title || "Untitled");
      editor?.commands.setContent(doc?.content || "");
    } catch (err) {
      console.error(err);
    }
  };

  const loadComments = async () => {
    try {
      const res = await getComments(id);
      setComments(res.data?.comments || []);
    } catch (err) {
      console.error(err);
    }
  };

  // ---------------- CHANGE ----------------
  const handleChange = (content) => {
    const sock = socketService.getSocket();
    sock?.emit("send_changes", { documentId: id, content });
    autoSave(content);
  };

  const autoSave = (content) => {
    clearTimeout(window.saveTimer);
    setSaving(true);

    window.saveTimer = setTimeout(async () => {
      try {
        await api.put(`/documents/${id}`, { title, content });
        setSaving(false);
      } catch {
        setSaving(false);
      }
    }, 1200);
  };

  // ---------------- TYPING ----------------
  let typingTimer;
  const emitTyping = () => {
    const sock = socketService.getSocket();
    if (!sock) return;

    sock.emit("user:typing", { documentId: id });

    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      sock.emit("user:stop-typing", { documentId: id });
    }, 1500);
  };

  // ---------------- COMMENT ----------------
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    await createComment({
      document: id,
      text: commentText,
    });

    setCommentText("");
  };

  return (
    <AppLayout>
      <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto h-full">

        {/* EDITOR */}
        <div className="flex-1">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-2xl font-bold bg-transparent text-white w-full"
          />

          <EditorContent editor={editor} className="min-h-[60vh]" />

          {saving && <p className="text-xs text-gray-400">Saving...</p>}
        </div>

        {/* SIDE PANEL */}
        <div className="w-80">
          {activeTab === "comments" ? (
            <div>
              {comments.map((c) => (
                <div key={c._id}>
                  <p>{c.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <AIAssistant documentContent={editor?.getHTML() || ""} />
          )}
        </div>

      </div>
    </AppLayout>
  );
}

export default DocumentEditor;
