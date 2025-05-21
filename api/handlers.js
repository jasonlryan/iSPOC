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
  "Timestamp,UserId,SessionId,Rating,Liked,Frustrated,FeatureRequest,AdditionalComments";
const QUERY_LOG_CSV_HEADERS = "Timestamp,UserId,SessionId,Query,Response";

// Feedback handler
async function handleFeedback(body) {
  try {
    const {
      q1,
      q2,
      q3,
      q4,
      q5, // q5 is now 'Additional comments'
      userId = "anonymous",
      sessionId = "unknown",
    } = body;

    // Basic validation (optional, consider if all 5 are truly required)
    if (!q1 || !q2 || !q3 || !q4 || !q5) {
      console.warn(
        "[API - handleFeedback] Missing one or more feedback fields (q1-q5). Proceeding with available data.",
        body
      );
      // Depending on strictness, you might return 400 here
      // return {
      //   status: 400,
      //   body: { error: "All feedback fields (q1-q5) are required" },
      // };
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

    // Create feedback entry object - updated for 5 questions
    const feedbackEntry = {
      timestamp,
      userId,
      sessionId,
      q1: q1 || "",
      q2: q2 || "",
      q3: q3 || "",
      q4: q4 || "",
      q5: q5 || "", // This is 'Additional comments'
    };

    // Store in Redis
    const redis = getRedisClient();

    try {
      await redis.lpush("feedbacks", JSON.stringify(feedbackEntry));
      console.log(
        "Successfully appended feedback to Redis list 'feedbacks'",
        feedbackEntry
      );
    } catch (error) {
      console.error(
        "[API - handleFeedback] Error appending to Redis list 'feedbacks':",
        error
      );
      // Potentially return 500 if this is critical
    }

    // Store in CSV format as well - updated for 5 questions
    const csvRow = `${timestamp},${userId},${sessionId},${sanitizeForCSV(
      q1 || ""
    )},${sanitizeForCSV(q2 || "")},${sanitizeForCSV(q3 || "")},${sanitizeForCSV(
      q4 || ""
    )},${sanitizeForCSV(q5 || "")}\n`;

    try {
      // Store the CSV row
      await redis.rpush("feedback_csv_rows_list", csvRow.trim());
      console.log("Successfully appended to 'feedback_csv_rows_list'");

      // Also store the headers (remains a simple string key)
      await redis.set("feedback_csv_headers", FEEDBACK_CSV_HEADERS);

      console.log("Feedback successfully stored in Redis");
    } catch (error) {
      console.error("Redis storage error:", error);
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

    // Store in Redis KV
    try {
      const redis = getRedisClient();

      // Store the query log in JSON format
      await redis.lpush("query_logs", JSON.stringify(logEntry));
      console.log("Query log successfully stored in Redis (JSON format)");
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
    const feedbackHeaders =
      (await redis.get("feedback_csv_headers")) || FEEDBACK_CSV_HEADERS;
    // Read all items from the list
    const feedbackRows =
      (await redis.lrange("feedback_csv_rows_list", 0, -1)) || [];
    console.log(
      `Retrieved ${feedbackRows.length} feedback entries from Redis list 'feedback_csv_rows_list'`
    );

    // Return CSV data
    return {
      status: 200,
      body: { headers: feedbackHeaders, rows: feedbackRows }, // feedbackRows is already an array
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
    const redis = getRedisClient();
    const retrievedEntries = (await redis.lrange("query_logs", 0, -1)) || [];
    console.log(
      `Retrieved ${retrievedEntries.length} query log entries from Redis list 'query_logs'`
    );
    // For diagnostics: log the type of the first retrieved entry if it exists
    if (retrievedEntries.length > 0) {
      console.log("Type of first retrieved entry:", typeof retrievedEntries[0]);
      console.log("First retrieved entry content:", retrievedEntries[0]);
    }

    const queryLogs = retrievedEntries
      .map((entry, index) => {
        if (typeof entry === "string") {
          try {
            return JSON.parse(entry);
          } catch (parseError) {
            console.error(
              `Error parsing log string at index ${index}:`,
              entry,
              parseError
            );
            return null; // Return null for entries that can't be parsed
          }
        } else if (typeof entry === "object" && entry !== null) {
          return entry; // Already an object, use directly
        } else {
          console.warn(
            `Unexpected entry type at index ${index}:`,
            typeof entry,
            entry
          );
          return null; // Skip unexpected types
        }
      })
      .filter(Boolean); // Remove null entries

    return {
      status: 200,
      body: { logs: queryLogs },
    };
  } catch (error) {
    console.error("Error retrieving query log data:", error);
    return {
      status: 500,
      body: { error: "Failed to retrieve query log data" },
    };
  }
}

// Add the missing function for clearing logs
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
    // Get Redis client
    const redis = getRedisClient();

    // Clear query logs data
    console.log("Clearing query logs from Redis");

    // Remove the stored CSV rows (now a list) and JSON logs
    await redis.del("query_log_csv_rows_list"); // New list key
    await redis.del("query_logs");
    // DEL query_log_csv_headers if you want to clear that too

    console.log("Successfully cleared query logs");

    return {
      status: 200,
      body: { success: true, message: "Query logs cleared successfully" },
    };
  } catch (error) {
    console.error("Error clearing query logs:", error);
    return {
      status: 500,
      body: { error: "Failed to clear query logs" },
    };
  }
}

// Function to clear feedback logs
async function handleClearFeedbackLogs(authHeader) {
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
    console.log("Clearing feedback logs from Redis");

    // Keys to delete for feedback
    // - "feedbacks": list of JSON feedback entries
    // - "feedback_csv_rows_list": list of CSV row strings for feedback
    // - "feedback_csv_headers": string key for CSV headers for feedback
    await redis.del("feedbacks");
    await redis.del("feedback_csv_rows_list");
    await redis.del("feedback_csv_headers");

    console.log("Successfully cleared feedback logs");

    return {
      status: 200,
      body: { success: true, message: "Feedback logs cleared successfully" },
    };
  } catch (error) {
    console.error("Error clearing feedback logs:", error);
    return {
      status: 500,
      body: { error: "Failed to clear feedback logs" },
    };
  }
}

module.exports = {
  handleFeedback,
  handleQueryLog,
  handleAdminFeedback,
  handleAdminLogs,
  handleClearQueryLogs,
  handleClearFeedbackLogs,
};
