// Simple Express server to handle API requests
const express = require("express");
const {
  handleAdminFeedback,
  handleAdminLogs,
  handleClearQueryLogs,
  handleFeedback,
  handleQueryLog,
} = require("./api/handlers");

const app = express();
const PORT = 3001;

// Enhanced middleware for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Middleware
app.use(express.json());

// Allow CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Admin Feedback API
app.get("/api/admin/feedback", async (req, res) => {
  console.log(
    "📊 ADMIN FEEDBACK API called with headers:",
    req.headers.authorization ? "Authorization present" : "No auth"
  );
  const result = await handleAdminFeedback(req.headers.authorization);
  console.log(
    "📊 ADMIN FEEDBACK RESULT:",
    result.status,
    result.body ? `${result.body.rows?.length || 0} rows` : "No data"
  );
  return res.status(result.status).json(result.body);
});

// Admin Logs API
app.get("/api/admin/logs", async (req, res) => {
  console.log("📊 ADMIN LOGS API called");
  const result = await handleAdminLogs(req.headers.authorization);
  console.log(
    "📊 ADMIN LOGS RESULT:",
    result.status,
    result.body ? `${result.body.rows?.length || 0} rows` : "No data"
  );
  return res.status(result.status).json(result.body);
});

// Clear Logs API
app.post("/api/admin/clear-logs", async (req, res) => {
  console.log("🧹 CLEAR LOGS API called");
  const result = await handleClearQueryLogs(req.headers.authorization);
  console.log("🧹 CLEAR LOGS RESULT:", result.status);
  return res.status(result.status).json(result.body);
});

// CRITICAL: THIS IS THE MAIN FEEDBACK SUBMISSION ENDPOINT
app.post("/api/feedback", async (req, res) => {
  console.log(
    "⭐ FEEDBACK API called with data:",
    JSON.stringify(req.body).substring(0, 100)
  );

  // Validate request body
  if (!req.body || Object.keys(req.body).length === 0) {
    console.error("❌ FEEDBACK API ERROR: Empty request body");
    return res.status(400).json({ error: "Request body is empty" });
  }

  // Check for required fields
  const { q1, q2, q3, q4, q5 } = req.body;
  if (!q1 || !q2 || !q3 || !q4 || !q5) {
    console.error("❌ FEEDBACK API ERROR: Missing required fields", req.body);
    return res.status(400).json({ error: "All feedback fields are required" });
  }

  try {
    // Process the feedback submission
    const result = await handleFeedback(req.body);
    console.log("⭐ FEEDBACK RESULT:", result.status, result.body);

    // Enhanced success logging
    if (result.status === 200) {
      console.log("✅ FEEDBACK SUCCESSFULLY SAVED TO REDIS");
    } else {
      console.error("❌ FEEDBACK FAILED:", result.status, result.body);
    }

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("❌ FEEDBACK API ERROR:", error);
    return res.status(500).json({ error: "Server error processing feedback" });
  }
});

// CRITICAL: THIS IS THE QUERY LOGGING ENDPOINT
app.post("/api/log", async (req, res) => {
  console.log(
    "📝 LOG API called with query:",
    req.body?.query ? req.body.query.substring(0, 50) : "No query"
  );

  // Validate request body
  if (!req.body || Object.keys(req.body).length === 0) {
    console.error("❌ LOG API ERROR: Empty request body");
    return res.status(400).json({ error: "Request body is empty" });
  }

  // Check for required fields
  const { query, response } = req.body;
  if (!query || !response) {
    console.error("❌ LOG API ERROR: Missing required fields", req.body);
    return res.status(400).json({ error: "Query and response are required" });
  }

  try {
    // Process the query log
    const result = await handleQueryLog(req.body);
    console.log("📝 LOG RESULT:", result.status, result.body);

    // Enhanced success logging
    if (result.status === 200) {
      console.log("✅ QUERY LOG SUCCESSFULLY SAVED TO REDIS");
    } else {
      console.error("❌ QUERY LOG FAILED:", result.status, result.body);
    }

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("❌ LOG API ERROR:", error);
    return res.status(500).json({ error: "Server error processing log" });
  }
});

// Testing endpoint
app.get("/api/test", (req, res) => {
  console.log("🧪 TEST API called");
  return res.status(200).json({ message: "API server is running correctly" });
});

// Add Redis connectivity test
app.get("/api/test-redis", async (req, res) => {
  console.log("🧪 TESTING REDIS CONNECTION");
  try {
    const { Redis } = require("@upstash/redis");
    const redis = new Redis({
      url:
        process.env.KV_REST_API_URL ||
        "https://upright-flounder-15167.upstash.io",
      token:
        process.env.KV_REST_API_TOKEN ||
        "ATs_AAIjcDE2NTU3MmUxMGVhMGM0YzNhOTNlOTZhZDY2MGE0MjQyOHAxMA",
    });

    // Test write operation
    const testKey = "redis-test-" + Date.now();
    await redis.set(testKey, "Test successful");

    // Test read operation
    const testValue = await redis.get(testKey);

    // Cleanup
    await redis.del(testKey);

    console.log("✅ REDIS CONNECTION SUCCESSFUL:", testValue);
    return res.status(200).json({
      success: true,
      message: "Redis connection successful",
      value: testValue,
    });
  } catch (error) {
    console.error("❌ REDIS CONNECTION ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Redis connection failed",
      error: error.message,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Available endpoints:`);
  console.log(` - GET  /api/admin/feedback   (Admin get feedback data)`);
  console.log(` - GET  /api/admin/logs       (Admin get query logs)`);
  console.log(` - POST /api/admin/clear-logs (Admin clear query logs)`);
  console.log(` - POST /api/feedback         (Submit feedback)`);
  console.log(` - POST /api/log              (Log query and response)`);
  console.log(` - GET  /api/test             (Test API server)`);
  console.log(` - GET  /api/test-redis       (Test Redis connection)`);
});
