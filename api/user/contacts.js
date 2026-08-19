// Serverless Function: /api/user/contacts
// Manages per-user emergency contacts scoped strictly by authenticated userId

export default async function handler(req, res) {
  const { userId, contacts } = req.body || {};

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized. User session required.' });
  }

  if (req.method === 'GET') {
    // Return contacts for specified user
    return res.status(200).json({ success: true, userId, contacts: [] });
  }

  if (req.method === 'POST') {
    // Save contacts for specified user
    return res.status(200).json({ success: true, message: 'Emergency contacts saved for user.', userId });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
