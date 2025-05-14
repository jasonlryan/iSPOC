/**
 * Protected admin API endpoint to retrieve all query log data as CSV
 */

const { handleAdminLogs } = require("../handlers");

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const result = await handleAdminLogs(req.headers.authorization);
  return res.status(result.status).json(result.body);
}
