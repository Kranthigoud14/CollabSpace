import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    text: {
      type: String,
      required: true,
    },

    // ⭐ IMPORTANT: what text user selected
    selectedText: {
      type: String,
      default: "",
    },

    // ⭐ IMPORTANT: position tracking (future-proof)
    anchor: {
      from: Number,
      to: Number,
    },

    resolved: {
      type: Boolean,
      default: false,
    },

    replies: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        text: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

const Comment = mongoose.model("Comment", commentSchema);

export default Comment;