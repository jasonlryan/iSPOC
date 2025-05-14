const { handleAdminFeedback } = require("../handlers");

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const result = await handleAdminFeedback(req.headers.authorization);
  return res.status(result.status).json(result.body);
}
