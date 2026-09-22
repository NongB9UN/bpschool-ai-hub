/**
 * LINE Messaging API Webhook Handler (Vercel Serverless Function)
 * Silent Ingestion Engine: รับข้อความจากกลุ่ม LINE แบบเงียบๆ ไม่ตอบกลับกวนใจ
 */

const crypto = require('crypto');

// In-Memory storage buffer for serverless session (can be connected to Supabase / Vercel KV)
global.schoolMessageStore = global.schoolMessageStore || [];

module.exports = async (req, res) => {
  // Allow only POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    const signature = req.headers['x-line-signature'];

    // 1. Signature Verification (if secret is configured)
    if (channelSecret && signature) {
      const bodyString = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const hash = crypto
        .createHmac('SHA256', channelSecret)
        .update(bodyString)
        .digest('base64');

      if (hash !== signature) {
        console.warn('[Webhook] Invalid signature received.');
        return res.status(401).json({ error: 'Unauthorized signature' });
      }
    }

    const { events } = req.body || {};
    if (!events || !Array.isArray(events)) {
      return res.status(200).send('No events');
    }

    // 2. Process Events in Silent Mode
    for (const event of events) {
      const { type, message, source, timestamp } = event;

      // Handle text messages from group or 1-on-1 chat
      if (type === 'message' && message && message.type === 'text') {
        const text = message.text.trim();
        const senderId = source?.userId || 'unknown';
        const groupId = source?.groupId || source?.roomId || 'direct';

        const record = {
          id: message.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          timestamp: timestamp || Date.now(),
          groupId,
          senderId,
          text,
          receivedAt: new Date().toISOString()
        };

        // Push to message store
        global.schoolMessageStore.push(record);
        console.log(`[Webhook Ingest] (${groupId}) Message: ${text.substring(0, 60)}`);
      }

      // Handle Bot Join Group Event
      if (type === 'join') {
        console.log(`[Webhook] Bot joined group: ${source?.groupId}`);
        // Do NOT send greeting message to stay silent
      }
    }

    // 3. Always respond with 200 OK without sending reply message to the group
    return res.status(200).json({ status: 'success', message: 'Events ingested silently' });

  } catch (error) {
    console.error('[Webhook Error]:', error);
    // Still return 200 to prevent LINE server from retrying unnecessarily
    return res.status(200).json({ status: 'error', details: error.message });
  }
};
