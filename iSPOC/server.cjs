// Simple script to run the feedback API server
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Route to handle feedback submissions
app.post("/api/feedback", async (req, res) => {
  try {
    const { q1, q2, q3, q4, q5 } = req.body;

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
    const csvLine = `${timestamp},${sanitizeForCSV(q1)},${sanitizeForCSV(
      q2
    )},${sanitizeForCSV(q3)},${sanitizeForCSV(q4)},${sanitizeForCSV(q5)}\n`;

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
        "Timestamp,Rating,Liked,Frustrated,FeatureRequest,Recommendation\n";
      await fs.promises.writeFile(csvFilePath, headers + csvLine);
      console.log(`Created new feedback CSV file at ${csvFilePath}`);
    } else {
      // File exists, append to it
      await fs.promises.appendFile(csvFilePath, csvLine);
      console.log(`Appended feedback to existing CSV file at ${csvFilePath}`);
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

// Start the server
app.listen(PORT, () => {
  console.log(`Feedback API server running on port ${PORT}`);
});

// No need to export since this is the main file
