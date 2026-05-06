// middleware/auth.js  — lightweight API-key guard (swap for JWT in production)
const authenticate = (req, res, next) => {
  const key = req.headers["x-api-key"] || req.query.apiKey;

  // In dev mode, skip auth entirely
  if (process.env.NODE_ENV === "development") {
    req.userId = "dev-user";
    return next();
  }

  if (!key || key !== process.env.API_KEY) {
    return res.status(401).json({ error: "Unauthorized — invalid or missing API key" });
  }

  req.userId = "api-user";
  next();
};

module.exports = { authenticate };
