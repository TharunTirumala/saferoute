// Serverless Function: /api/auth/verify-otp
// Validates 6-digit OTP against cryptographic challenge token and issues authenticated user session

import crypto from 'crypto';

const OTP_SECRET = process.env.OTP_SECRET || 'saferoute_secure_otp_secret_key_2026';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { phone, otp, challengeToken } = req.body || {};
    const cleanDigits = (phone || '').replace(/[^0-9]/g, '');
    const cleanOtp = (otp || '').trim();

    if (!cleanDigits || cleanOtp.length !== 6 || !challengeToken) {
      return res.status(400).json({ error: 'Invalid verification parameters. Please provide full 6-digit OTP.' });
    }

    const formattedPhone = cleanDigits.length === 10 ? `+91${cleanDigits}` : `+${cleanDigits}`;

    // Decode challenge token
    let payload;
    try {
      payload = JSON.parse(Buffer.from(challengeToken, 'base64').toString('utf8'));
    } catch (e) {
      return res.status(400).json({ error: 'Invalid or corrupted verification token. Please request a new OTP.' });
    }

    if (payload.phone !== formattedPhone) {
      return res.status(400).json({ error: 'Mobile number mismatch. Please request a new OTP.' });
    }

    if (Date.now() > payload.expiresAt) {
      return res.status(400).json({ error: 'OTP has expired. Please click Resend OTP.' });
    }

    // Verify cryptographic HMAC signature
    const hashPayload = `${formattedPhone}:${cleanOtp}:${payload.expiresAt}`;
    const expectedHmac = crypto.createHmac('sha256', OTP_SECRET).update(hashPayload).digest('hex');

    if (expectedHmac !== payload.hmac) {
      return res.status(400).json({ error: 'Incorrect OTP code. Please check and re-enter.' });
    }

    // Generate secure session token for authenticated user
    const sessionPayload = {
      phone: formattedPhone,
      authenticatedAt: new Date().toISOString(),
      nonce: crypto.randomBytes(8).toString('hex')
    };
    const sessionToken = Buffer.from(JSON.stringify(sessionPayload)).toString('base64');

    return res.status(200).json({
      success: true,
      message: 'Mobile number verified successfully.',
      sessionToken,
      user: {
        phone: formattedPhone,
        authenticatedAt: sessionPayload.authenticatedAt
      }
    });
  } catch (err) {
    console.error('Error in verify-otp:', err);
    return res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
}
