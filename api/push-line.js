/**
 * LINE Messaging API Push Message Helper
 * Sends daily executive briefing to the Director or Test Group
 */

async function sendLinePushMessage(targetId, textContent) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not configured');
  }

  const payload = {
    to: targetId,
    messages: [
      {
        type: 'text',
        text: textContent
      }
    ]
  };

  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LINE Push API failed [${response.status}]: ${errorText}`);
  }

  return await response.json();
}

module.exports = {
  sendLinePushMessage
};
