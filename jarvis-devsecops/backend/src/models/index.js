const mongoose = require("mongoose");

// ── Chat Message Schema ───────────────────────────────────────────────────────
const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 10000,
    },
    sources: [
      {
        filename: String,
        page: Number,
        excerpt: String,
      },
    ],
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      default: "anonymous",
    },
    tokensUsed: Number,
    latencyMs: Number,
  },
  { timestamps: true }
);

// ── Document Schema ───────────────────────────────────────────────────────────
const documentSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, default: "application/pdf" },
    sizeBytes: Number,
    chunksIndexed: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["processing", "ready", "error"],
      default: "processing",
    },
    uploadedBy: { type: String, default: "anonymous" },
    errorMessage: String,
  },
  { timestamps: true }
);

// ── Session Schema ────────────────────────────────────────────────────────────
const sessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, default: "anonymous" },
    messageCount: { type: Number, default: 0 },
    lastActive: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);
const Document = mongoose.model("Document", documentSchema);
const Session = mongoose.model("Session", sessionSchema);

module.exports = { Message, Document, Session };
