const express = require("express");
const cors = require("cors");
const {
  handleFeedback,
  handleQueryLog,
  handleAdminFeedback,
  handleAdminLogs,
} = require("./api/handlers.js");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Feedback endpoint
app.post("/api/feedback", async (req, res) => {
  const result = await handleFeedback(req.body);
  return res.status(result.status).json(result.body);
});

// Query log endpoint
app.post("/api/log", async (req, res) => {
  const result = await handleQueryLog(req.body);
  return res.status(result.status).json(result.body);
});

// Admin feedback endpoint
app.get("/api/admin/feedback", async (req, res) => {
  const result = await handleAdminFeedback(req.headers.authorization);
  return res.status(result.status).json(result.body);
});

// Admin logs endpoint
app.get("/api/admin/logs", async (req, res) => {
  const result = await handleAdminLogs(req.headers.authorization);
  return res.status(result.status).json(result.body);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Local API server running on port ${PORT}`);
});
