const { Redis } = require("@upstash/redis");

// Initialize Redis client
const getRedisClient = () => {
  return new Redis({
    url:
      process.env.KV_REST_API_URL ||
      "https://upright-flounder-15167.upstash.io",
    token:
      process.env.KV_REST_API_TOKEN ||
      "ATs_AAIjcDE2NTU3MmUxMGVhMGM0YzNhOTNlOTZhZDY2MGE0MjQyOHAxMA",
  });
};

// Simple security - in production, use proper authentication
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "1234";

// Define CSV headers
const FEEDBACK_CSV_HEADERS =
  "Timestamp,Rating,Liked,Frustrated,FeatureRequest,Recommendation,AdditionalComments";
const QUERY_LOG_CSV_HEADERS = "Timestamp,UserId,SessionId,Query,Response";

// Feedback handler
async function handleFeedback(body) {
  try {
    const { q1, q2, q3, q4, q5, q6 } = body;

    if (!q1 || !q2 || !q3 || !q4 || !q5) {
      return {
        status: 400,
        body: { error: "All feedback fields are required" },
      };
    }

    const timestamp = new Date().toISOString();

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
      const redis = getRedisClient();

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
    return {
      status: 200,
      body: { success: true, message: "Feedback logged successfully" },
    };
  } catch (error) {
    console.error("Error logging feedback:", error);
    return {
      status: 500,
      body: { error: "Failed to log feedback" },
    };
  }
}

// Query log handler
async function handleQueryLog(body) {
  try {
    const {
      query,
      response,
      userId = "anonymous",
      sessionId = "unknown",
    } = body;

    // Validate required fields
    if (!query || !response) {
      return {
        status: 400,
        body: { error: "Query and response are required" },
      };
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

      // Sanitize the response by removing welcome messages if present
      let sanitized = String(value);

      // Trim the response of any unnecessary whitespace
      sanitized = sanitized.trim();

      // Remove common welcome phrases and other preamble texts
      sanitized = sanitized
        .replace(
          /^(Hello|Hi|Welcome|Thank you for|I'm your|I am your).*?(How can I help you today\?|How can I assist you\?|How may I assist you\?|What can I help you with\?).*/i,
          ""
        )
        .trim();

      // If full message was just a welcome message, return empty
      if (sanitized === "" && String(value).length > 0) {
        console.log(
          "Detected and removed welcome message, returning empty string"
        );
        return "";
      }

      // Replace newlines with spaces for CSV format
      sanitized = sanitized.replace(/\r?\n/g, " ");

      // Handle CSV escaping (double quotes)
      sanitized = sanitized.replace(/"/g, '""');

      // Wrap text with commas or quotes in double quotes
      return sanitized.includes(",") || sanitized.includes('"')
        ? `"${sanitized}"`
        : sanitized;
    };

    const csvRow = [
      logEntry.timestamp,
      sanitizeForCSV(logEntry.userId),
      sanitizeForCSV(logEntry.sessionId),
      sanitizeForCSV(logEntry.query),
      sanitizeForCSV(
        logEntry.response ? logEntry.response.substring(0, 500) : ""
      ), // Truncate response to avoid huge logs
    ].join(",");

    // Store in Redis KV
    try {
      const redis = getRedisClient();

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

    return {
      status: 200,
      body: { success: true, message: "Query logged successfully" },
    };
  } catch (error) {
    console.error("Error logging query:", error);
    return {
      status: 500,
      body: { error: "Failed to log query" },
    };
  }
}

// Admin feedback handler
async function handleAdminFeedback(authHeader) {
  // Check authentication
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      status: 401,
      body: { error: "Unauthorized" },
    };
  }

  const token = authHeader.substring(7);
  if (token !== ADMIN_PASSWORD) {
    return {
      status: 401,
      body: { error: "Invalid credentials" },
    };
  }

  try {
    // Get the data from Redis
    const redis = getRedisClient();
    const headers =
      (await redis.get("feedback_csv_headers")) || FEEDBACK_CSV_HEADERS;
    const rows = (await redis.get("feedback_csv_rows")) || [];

    console.log(
      `Retrieved ${rows ? rows.length : 0} feedback entries from Redis`
    );

    // Return CSV data
    return {
      status: 200,
      body: { headers, rows: rows || [] },
    };
  } catch (error) {
    console.error("Error retrieving feedback data:", error);
    return {
      status: 500,
      body: { error: "Failed to retrieve feedback data" },
    };
  }
}

// Admin logs handler
async function handleAdminLogs(authHeader) {
  // Check authentication
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      status: 401,
      body: { error: "Unauthorized" },
    };
  }

  const token = authHeader.substring(7);
  if (token !== ADMIN_PASSWORD) {
    return {
      status: 401,
      body: { error: "Invalid credentials" },
    };
  }

  try {
    // Get the data from Redis
    const redis = getRedisClient();
    const headers =
      (await redis.get("query_log_csv_headers")) || QUERY_LOG_CSV_HEADERS;
    const rows = (await redis.get("query_log_csv_rows")) || [];

    console.log(
      `Retrieved ${rows ? rows.length : 0} query log entries from Redis`
    );

    // Return CSV data
    return {
      status: 200,
      body: { headers, rows: rows || [] },
    };
  } catch (error) {
    console.error("Error retrieving query log data:", error);
    return {
      status: 500,
      body: { error: "Failed to retrieve query log data" },
    };
  }
}

// Admin clear query logs handler
async function handleClearQueryLogs(authHeader) {
  // Check authentication
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      status: 401,
      body: { error: "Unauthorized" },
    };
  }

  const token = authHeader.substring(7);
  if (token !== ADMIN_PASSWORD) {
    return {
      status: 401,
      body: { error: "Invalid credentials" },
    };
  }

  try {
    const redis = getRedisClient();
    await redis.del("query_log_csv_rows");
    await redis.del("query_logs");
    await redis.del("query_log_csv_headers");
    return {
      status: 200,
      body: { success: true, message: "Query logs cleared" },
    };
  } catch (error) {
    return {
      status: 500,
      body: { error: "Failed to clear query logs" },
    };
  }
}

module.exports = {
  handleFeedback,
  handleQueryLog,
  handleAdminFeedback,
  handleAdminLogs,
  handleClearQueryLogs,
};
