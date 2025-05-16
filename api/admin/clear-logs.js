const { handleClearQueryLogs } = require("../handlers");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const result = await handleClearQueryLogs(req.headers.authorization);
  return res.status(result.status).json(result.body);
};
