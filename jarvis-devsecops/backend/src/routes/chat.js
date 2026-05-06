/**
 * Chat routes — wraps the Python RAG service via HTTP
 * Saves messages to MongoDB for history persistence
 */

const express = require("express");
const { body, validationResult } = require("express-validator");
const axios = require("axios");
const { Message, Session } = require("../models");

const router = express.Router();
const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || "http://rag-service:8000";

// ── Input validation middleware ───────────────────────────────────────────────
const validateQuery = [
  body("question")
    .trim()
    .notEmpty().withMessage("Question is required")
    .isLength({ max: 2000 }).withMessage("Question too long (max 2000 chars)")
    .escape(),
  body("sessionId")
    .trim()
    .notEmpty().withMessage("Session ID required")
    .matches(/^[A-Za-z0-9_-]+$/).withMessage("Invalid session ID"),
];

// ── POST /api/chat/query ──────────────────────────────────────────────────────
router.post("/query", validateQuery, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { question, sessionId } = req.body;
  const start = Date.now();

  try {
    // 1. Save user message to MongoDB
    await Message.create({
      role: "user",
      content: question,
      sessionId,
      userId: req.userId || "anonymous",
    });

    // 2. Forward question to Python RAG microservice
    const ragResponse = await axios.post(
      `${RAG_SERVICE_URL}/query`,
      { question },
      { timeout: 60000 }
    );

    const { answer, sources } = ragResponse.data;
    const latencyMs = Date.now() - start;

    // 3. Persist assistant reply to MongoDB
    const assistantMsg = await Message.create({
      role: "assistant",
      content: answer,
      sources: sources || [],
      sessionId,
      latencyMs,
    });

    // 4. Update session metadata
    await Session.findOneAndUpdate(
      { sessionId },
      { $inc: { messageCount: 2 }, lastActive: new Date() },
      { upsert: true, new: true }
    );

    res.json({
      answer,
      sources: sources || [],
      messageId: assistantMsg._id,
      latencyMs,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/chat/history/:sessionId ─────────────────────────────────────────
router.get("/history/:sessionId", async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const messages = await Message.find({ sessionId })
      .sort({ createdAt: 1 })
      .limit(100)
      .select("-__v");

    res.json({ messages, count: messages.length });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/chat/history/:sessionId ──────────────────────────────────────
router.delete("/history/:sessionId", async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    await Message.deleteMany({ sessionId });
    res.json({ message: "Chat history cleared" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
