const { handleAdminLogs } = require("../handlers");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const result = await handleAdminLogs(req.headers.authorization);
  return res.status(result.status).json(result.body);
};
