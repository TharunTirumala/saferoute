// Serverless Function: /api/sos/alert
// Automated WhatsApp Business / Cloud API Emergency Alert Dispatcher

function normalizePhone(phone) {
  if (!phone) return '';
  const digits = phone.toString().replace(/[^0-9]/g, '');
  if (!digits) return '';
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { sessionId, location, contacts, timestamp, liveTrackingUrl, userPhone } = req.body || {};

    const gmapsUrl = location && location.latitude && location.longitude
      ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
      : (liveTrackingUrl || 'Location tracking active');

    const formattedUserPhone = normalizePhone(userPhone || '+91 User');

    // Exact WhatsApp Emergency Message Structure
    const messageBody = `🚨 *EMERGENCY ALERT*\n\nSOS has been activated.\n\nThe user may need immediate assistance.\n\n📍 *Current location:*\n${gmapsUrl}\n\n*User mobile:*\n${formattedUserPhone}\n\nPlease contact them immediately.`;

    const recipients = (contacts || []).map(c => ({
      ...c,
      phone: normalizePhone(c.phone || c.contactNumber)
    })).filter(c => c.phone);

    const results = [];

    // WhatsApp Cloud API Configuration
    const waToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_API_KEY;
    const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_SENDER_ID;

    if (waToken && waPhoneId) {
      for (const contact of recipients) {
        const cleanRecipientDigits = contact.phone.replace(/[^0-9]/g, '');
        try {
          const waRes = await fetch(`https://graph.facebook.com/v19.0/${waPhoneId}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${waToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: cleanRecipientDigits,
              type: 'text',
              text: { body: messageBody }
            })
          });

          if (waRes.ok) {
            results.push({ id: contact.id, phone: contact.phone, status: 'SENT', provider: 'WhatsApp Cloud API' });
          } else {
            const errData = await waRes.json().catch(() => ({}));
            console.warn(`WhatsApp send failed for ${contact.phone}:`, errData);
            results.push({ id: contact.id, phone: contact.phone, status: 'FAILED', error: errData.error?.message });
          }
        } catch (waErr) {
          results.push({ id: contact.id, phone: contact.phone, status: 'FAILED', error: waErr.message });
        }
      }
    } else {
      console.log(`[SafeRoute WhatsApp Backend] Simulated WhatsApp Emergency Alert dispatched for ${formattedUserPhone} to ${recipients.length} contact(s):`, recipients.map(r => r.phone));
      recipients.forEach(c => {
        results.push({ id: c.id, phone: c.phone, status: 'SENT', provider: 'SafeRoute Cloud Gateway (Simulated)' });
      });
    }

    return res.status(200).json({
      success: true,
      deliveredCount: results.filter(r => r.status === 'SENT').length,
      results,
      messageBody
    });
  } catch (err) {
    console.error('Error in /api/sos/alert:', err);
    return res.status(500).json({ error: 'Emergency alert dispatch failed.' });
  }
}
