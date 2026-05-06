/**
 * JARVIS — Express Backend
 * RAG pipeline now served via REST API (replaces Streamlit)
 * Security: Helmet, CORS, rate-limiting, input validation (OWASP Top-10 aligned)
 */

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const path = require("path");

const chatRoutes = require("./routes/chat");
const documentRoutes = require("./routes/documents");
const healthRoutes = require("./routes/health");
const { errorHandler } = require("./middleware/errorHandler");
const { authenticate } = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security middleware (Level 13: Secure A Vulnerable Application) ──────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
    },
  },
}));

// CORS — only allow the React frontend
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
}));

// Rate limiting — prevents abuse (OWASP A04: Insecure Design)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});
app.use("/api/", limiter);

// Body parsing & logging
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ── MongoDB connection (Level 14: React + Node.js + MongoDB) ─────────────────
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/jarvis", {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
};
connectDB();

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/health", healthRoutes);
app.use("/api/chat", authenticate, chatRoutes);
app.use("/api/documents", authenticate, documentRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Global error handler
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`🤖 JARVIS backend running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received — shutting down gracefully");
  server.close(() => {
    mongoose.connection.close();
    process.exit(0);
  });
});

module.exports = app;
