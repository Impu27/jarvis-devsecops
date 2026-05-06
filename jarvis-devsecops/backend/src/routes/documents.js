/**
 * Document routes — handles PDF upload & indexing
 * Forwards file to Python RAG service for ChromaDB ingestion
 */

const express = require("express");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const { Document } = require("../models");

const router = express.Router();
const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || "http://rag-service:8000";

// ── Multer config — memory storage, PDF only, 20 MB max ──────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are accepted"), false);
    }
  },
});

// ── POST /api/documents/upload ────────────────────────────────────────────────
router.post("/upload", upload.single("file"), async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: "No PDF file provided" });
  }

  // Create a DB record immediately so the UI can track status
  const doc = await Document.create({
    filename: `${Date.now()}-${req.file.originalname}`,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
    status: "processing",
    uploadedBy: req.userId || "anonymous",
  });

  try {
    // Forward the file buffer to Python RAG microservice
    const form = new FormData();
    form.append("file", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });
    form.append("source", doc.filename);
    form.append("display_name", req.file.originalname);

    const ragResponse = await axios.post(`${RAG_SERVICE_URL}/ingest`, form, {
      headers: form.getHeaders(),
      timeout: 120000, // 2 min for large PDFs
    });

    const { chunks_indexed } = ragResponse.data;

    // Update MongoDB record to "ready"
    await Document.findByIdAndUpdate(doc._id, {
      chunksIndexed: chunks_indexed,
      status: "ready",
    });

    const updatedDoc = await Document.findById(doc._id).select("-__v");
    res.json(updatedDoc);
  } catch (err) {
    // Mark as error so the UI can show a clear message
    await Document.findByIdAndUpdate(doc._id, {
      status: "error",
      errorMessage: err.message,
    });
    next(err);
  }
});

// ── GET /api/documents ────────────────────────────────────────────────────────
router.get("/", async (req, res, next) => {
  try {
    const docs = await Document.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .select("-__v");
    res.json({ documents: docs, count: docs.length });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/documents/:id ─────────────────────────────────────────────────
router.delete("/:id", async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    try {
      await axios.post(
        `${RAG_SERVICE_URL}/delete`,
        { source: doc.filename },
        { timeout: 120000 }
      );
    } catch (err) {
      console.warn("RAG service document delete failed:", err.message || err);
    }

    await Document.findByIdAndDelete(req.params.id);
    res.json({ message: "Document deleted", documentId: req.params.id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
