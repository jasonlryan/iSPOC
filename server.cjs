// Simple script to run the feedback API server
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const { Redis } = require("@upstash/redis");

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Redis client
const redis = new Redis({
  url:
    process.env.KV_REST_API_URL || "https://upright-flounder-15167.upstash.io",
  token:
    process.env.KV_REST_API_TOKEN ||
    "ATs_AAIjcDE2NTU3MmUxMGVhMGM0YzNhOTNlOTZhZDY2MGE0MjQyOHAxMA",
});

// Simple security - in production, use proper authentication
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "1234";

// Middleware
app.use(cors());
app.use(express.json());

// Define CSV headers
const FEEDBACK_CSV_HEADERS =
  "Timestamp,Rating,Liked,Frustrated,FeatureRequest,Recommendation,AdditionalComments";
const QUERY_LOG_CSV_HEADERS = "Timestamp,UserId,SessionId,Query,Response";

// Route to handle feedback submissions
app.post("/api/feedback", async (req, res) => {
  try {
    const { q1, q2, q3, q4, q5, q6 } = req.body;

    if (!q1 || !q2 || !q3 || !q4 || !q5) {
      return res
        .status(400)
        .json({ error: "All feedback fields are required" });
    }

    const timestamp = new Date().toISOString();
    const csvFilePath = path.join(__dirname, "feedback-results.csv");

    // Sanitize feedback values for CSV (replace commas, quotes, newlines)
    const sanitizeForCSV = (value) => {
      if (!value) return "";
      // Replace newlines with space, then double quotes with two double quotes (CSV standard)
      const sanitized = value.replace(/\r?\n/g, " ").replace(/"/g, '""');
      // If the value contains commas, quotes, or newlines, wrap in quotes
      return sanitized.includes(",") ||
        sanitized.includes('"') ||
        sanitized.includes("\n")
        ? `"${sanitized}"`
        : sanitized;
    };

    // Create a CSV line for the feedback
    const csvRow = `${timestamp},${sanitizeForCSV(q1)},${sanitizeForCSV(
      q2
    )},${sanitizeForCSV(q3)},${sanitizeForCSV(q4)},${sanitizeForCSV(
      q5
    )},${sanitizeForCSV(q6 || "")}\n`;

    // Check if file exists to add headers if needed
    let fileExists = false;
    try {
      await fs.promises.access(csvFilePath);
      fileExists = true;
    } catch (err) {
      // File doesn't exist, we'll create it with headers
    }

    if (!fileExists) {
      // File doesn't exist yet, create it with headers
      const headers =
        "Timestamp,Rating,Liked,Frustrated,FeatureRequest,Recommendation,AdditionalComments\n";
      await fs.promises.writeFile(csvFilePath, headers + csvRow);
      console.log(`Created new feedback CSV file at ${csvFilePath}`);
    } else {
      // File exists, append to it
      await fs.promises.appendFile(csvFilePath, csvRow);
      console.log(`Appended feedback to existing CSV file at ${csvFilePath}`);
    }

    // Create feedback object with timestamp
    const feedback = {
      q1,
      q2,
      q3,
      q4,
      q5,
      q6: q6 || "",
      timestamp: timestamp,
    };

    // Store in Redis KV
    try {
      // Store the feedback in JSON format
      await redis.lpush("feedbacks", JSON.stringify(feedback));

      // Store as CSV rows for easy export
      const existingRows = (await redis.get("feedback_csv_rows")) || [];
      existingRows.push(csvRow.trim());
      await redis.set("feedback_csv_rows", existingRows);

      // Also store the headers
      await redis.set("feedback_csv_headers", FEEDBACK_CSV_HEADERS);

      console.log("Feedback successfully stored in Redis");
    } catch (redisError) {
      console.error("Redis storage error:", redisError);
      // Continue execution even if Redis fails
    }

    console.log(`Successfully logged feedback for user`);
    return res
      .status(200)
      .json({ success: true, message: "Feedback logged successfully" });
  } catch (error) {
    console.error("Error logging feedback:", error);
    return res.status(500).json({ error: "Failed to log feedback" });
  }
});

// Route to handle query logging
app.post("/api/log", async (req, res) => {
  try {
    const {
      query,
      response,
      userId = "anonymous",
      sessionId = "unknown",
    } = req.body;

    // Validate required fields
    if (!query || !response) {
      return res.status(400).json({ error: "Query and response are required" });
    }

    // Create log object with timestamp
    const logEntry = {
      query,
      response,
      userId,
      sessionId,
      timestamp: new Date().toISOString(),
    };

    // Generate a CSV row format for logging
    const sanitizeForCSV = (value) => {
      if (!value) return "";
      const formatted = String(value).replace(/\r?\n/g, " ");
      return formatted.includes(",")
        ? `"${formatted.replace(/"/g, '""')}"`
        : formatted;
    };

    const csvRow = [
      logEntry.timestamp,
      sanitizeForCSV(logEntry.userId),
      sanitizeForCSV(logEntry.sessionId),
      sanitizeForCSV(logEntry.query),
      sanitizeForCSV(logEntry.response),
    ].join(",");

    // Store in Redis KV
    try {
      // Store the query log in JSON format
      await redis.lpush("query_logs", JSON.stringify(logEntry));

      // Store as CSV rows for easy export
      const existingRows = (await redis.get("query_log_csv_rows")) || [];
      existingRows.push(csvRow);
      await redis.set("query_log_csv_rows", existingRows);

      // Also store the headers
      await redis.set("query_log_csv_headers", QUERY_LOG_CSV_HEADERS);

      console.log("Query log successfully stored in Redis");
    } catch (redisError) {
      console.error("Redis storage error:", redisError);
      // Continue execution even if Redis fails
    }

    return res.status(200).json({
      success: true,
      message: "Query logged successfully",
    });
  } catch (error) {
    console.error("Error logging query:", error);
    return res.status(500).json({ error: "Failed to log query" });
  }
});

// Admin API endpoint for retrieving feedback data
app.get("/api/admin/feedback", async (req, res) => {
  // Check authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.substring(7);
  if (token !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  try {
    // Get the data from Redis
    const headers =
      (await redis.get("feedback_csv_headers")) || FEEDBACK_CSV_HEADERS;
    const rows = (await redis.get("feedback_csv_rows")) || [];

    console.log(
      `Retrieved ${rows ? rows.length : 0} feedback entries from Redis`
    );

    // Return CSV data
    return res.status(200).json({
      headers,
      rows: rows || [],
    });
  } catch (error) {
    console.error("Error retrieving feedback data:", error);
    return res.status(500).json({ error: "Failed to retrieve feedback data" });
  }
});

// Admin API endpoint for retrieving query log data
app.get("/api/admin/logs", async (req, res) => {
  // Check authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.substring(7);
  if (token !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  try {
    // Get the data from Redis
    const headers =
      (await redis.get("query_log_csv_headers")) || QUERY_LOG_CSV_HEADERS;
    const rows = (await redis.get("query_log_csv_rows")) || [];

    console.log(
      `Retrieved ${rows ? rows.length : 0} query log entries from Redis`
    );

    // Return CSV data
    return res.status(200).json({
      headers,
      rows: rows || [],
    });
  } catch (error) {
    console.error("Error retrieving query log data:", error);
    return res.status(500).json({ error: "Failed to retrieve query log data" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});

// No need to export since this is the main file
