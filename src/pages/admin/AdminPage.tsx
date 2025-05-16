import React, { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card } from "../../components/ui/card";

// Simple password protection - obviously in a real app, you'd use a proper authentication system
const ADMIN_PASSWORD =
  import.meta.env.VITE_ADMIN_PASSWORD || "mha-admin-password";

interface CSVData {
  headers: string;
  rows: string[];
}

const AdminPage: React.FC = () => {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [feedbackData, setFeedbackData] = useState<CSVData>({
    headers: "",
    rows: [],
  });
  const [queryLogData, setQueryLogData] = useState<CSVData>({
    headers: "",
    rows: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem("admin_authenticated", "true");
    } else {
      setError("Invalid password");
    }
  };

  // Check if user was previously authenticated
  useEffect(() => {
    const isAuth = localStorage.getItem("admin_authenticated");
    if (isAuth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  const fetchFeedbackData = async () => {
    setLoading(true);
    setError("");
    try {
      // Fetch from the admin feedback API endpoint
      const response = await fetch("/api/admin/feedback", {
        headers: {
          Authorization: `Bearer ${ADMIN_PASSWORD}`,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch feedback data: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      if (data.rows && Array.isArray(data.rows)) {
        setFeedbackData({
          headers:
            data.headers ||
            "Timestamp,Rating,Liked,Frustrated,FeatureRequest,Recommendation,AdditionalComments",
          rows: data.rows,
        });
        console.log(`Loaded ${data.rows.length} feedback entries`);
      } else {
        console.log("No feedback data found or invalid format", data);
        setFeedbackData({
          headers:
            "Timestamp,Rating,Liked,Frustrated,FeatureRequest,Recommendation,AdditionalComments",
          rows: [],
        });
      }
    } catch (err) {
      console.error("Error fetching feedback data:", err);
      setError(
        "Failed to fetch feedback data: " +
          (err instanceof Error ? err.message : String(err))
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchQueryLogData = async () => {
    setLoading(true);
    setError("");
    try {
      // Fetch from the admin logs API endpoint
      const response = await fetch("/api/admin/logs", {
        headers: {
          Authorization: `Bearer ${ADMIN_PASSWORD}`,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch query log data: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      if (data.rows && Array.isArray(data.rows)) {
        setQueryLogData({
          headers: data.headers || "Timestamp,UserId,SessionId,Query,Response",
          rows: data.rows,
        });
        console.log(`Loaded ${data.rows.length} query log entries`);
      } else {
        console.log("No query log data found or invalid format", data);
        setQueryLogData({
          headers: "Timestamp,UserId,SessionId,Query,Response",
          rows: [],
        });
      }
    } catch (err) {
      console.error("Error fetching query log data:", err);
      setError(
        "Failed to fetch query log data: " +
          (err instanceof Error ? err.message : String(err))
      );
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = (data: CSVData, filename: string) => {
    const csvContent = `${data.headers}\n${data.rows.join("\n")}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("admin_authenticated");
  };

  const clearQueryLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/clear-logs", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ADMIN_PASSWORD}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to clear query logs");
      }
      // Refresh logs after clearing
      await fetchQueryLogData();
      alert("Query logs cleared successfully.");
    } catch (err) {
      setError(
        "Failed to clear query logs: " +
          (err instanceof Error ? err.message : String(err))
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Card className="w-full max-w-md p-8 space-y-4">
          <h1 className="text-2xl font-bold text-center">Admin Access</h1>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleLogin();
                  }
                }}
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button className="w-full" onClick={handleLogin}>
              Login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">MHA Admin Dashboard</h1>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-semibold">Feedback Data</h2>
            <p className="text-gray-500 text-sm">
              Download all user feedback as a CSV file
            </p>
            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={fetchFeedbackData}
                disabled={loading}
              >
                {loading ? "Loading..." : "Fetch Feedback Data"}
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() =>
                  downloadCSV(feedbackData, "mha-feedback-data.csv")
                }
                disabled={loading || feedbackData.rows.length === 0}
              >
                Download CSV ({feedbackData.rows.length} rows)
              </Button>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-semibold">Query Logs</h2>
            <p className="text-gray-500 text-sm">
              Download all user queries and responses as a CSV file
            </p>
            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={fetchQueryLogData}
                disabled={loading}
              >
                {loading ? "Loading..." : "Fetch Query Log Data"}
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => downloadCSV(queryLogData, "mha-query-logs.csv")}
                disabled={loading || queryLogData.rows.length === 0}
              >
                Download CSV ({queryLogData.rows.length} rows)
              </Button>

              <Button
                variant="destructive"
                className="w-full"
                onClick={clearQueryLogs}
                disabled={loading}
              >
                {loading ? "Clearing..." : "Clear Query Logs"}
              </Button>
            </div>
          </Card>
        </div>

        <div className="mt-8 bg-yellow-50 border border-yellow-100 p-4 rounded-md text-yellow-800 text-sm">
          <p className="font-medium">Implementation Notes:</p>
          <p className="mt-1">
            Data is now stored in Upstash Redis and accessed via the serverless
            functions. Features available:
          </p>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>
              Feedback data is stored in Redis using the key{" "}
              <code>feedback_csv_rows</code>
            </li>
            <li>
              Query logs are stored in Redis using the key{" "}
              <code>query_log_csv_rows</code>
            </li>
            <li>
              The dashboard loads this data from the Admin APIs with
              authorization
            </li>
            <li>CSV export is generated from the data stored in Redis</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
