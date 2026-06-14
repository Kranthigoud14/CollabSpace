import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      default: null,
    },

    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },

    action: {
      type: String,
      required: true,
      // examples: "created_document", "edited_document", "created_task"
    },

    message: {
      type: String,
      default: "",
    },

    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

const Activity = mongoose.model("Activity", activitySchema);

export default Activity;