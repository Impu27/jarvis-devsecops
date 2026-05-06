// middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  // Multer errors (file upload)
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "File too large. Max 20 MB." });
  }
  if (err.message === "Only PDF files are accepted") {
    return res.status(415).json({ error: err.message });
  }

  // Mongoose validation errors
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: "Validation failed", details: messages });
  }

  // Axios/RAG service errors
  if (err.code === "ECONNREFUSED" || err.code === "ECONNABORTED") {
    return res.status(503).json({
      error: "RAG service unavailable. Is the Python service running?",
    });
  }

  console.error("[Error]", err);

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message,
  });
};

module.exports = { errorHandler };
