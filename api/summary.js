/**
 * AI Summary Generator & Executive Dispatcher (Vercel Serverless Function)
 * Analyzes ingested school messages, categorizes operations, and pushes briefing to Director
 */

const { sendLinePushMessage } = require('./push-line');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const shouldPush = req.query.push === 'true' || req.query.push === '1';
    const targetDate = req.query.date || new Date().toISOString().split('T')[0];
    
    // Retrieve stored messages for today or fallback to sample logic
    const store = global.schoolMessageStore || [];
    const messages = store.filter(m => {
      const msgDate = new Date(m.timestamp).toISOString().split('T')[0];
      return msgDate === targetDate;
    });

    console.log(`[Summary Engine] Generating summary for date: ${targetDate} (${messages.length} messages)`);

    // AI / NLP Rule-based Analysis Engine
    const incidents = [];
    const academic = [];
    const lunchStats = [];
    const tasks = [];

    messages.forEach((msg, idx) => {
      const t = msg.text.toLowerCase();

      // Health & Safety
      if (t.includes('ตัวร้อน') || t.includes('ป่วย') || t.includes('ไข้') || t.includes('แพ้ยา') || t.includes('ไม่สบาย')) {
        incidents.push(`- 🚨 ${msg.text.substring(0, 70)}`);
      } else if (t.includes('กลับบ้าน') || t.includes('ผปค') || t.includes('รับกลับ')) {
        incidents.push(`- ℹ️ ผปค. รับนักเรียน: ${msg.text.substring(0, 60)}`);
      } else if (t.includes('ปลั๊ก') || t.includes('ไฟ') || t.includes('ความปลอดภัย')) {
        incidents.push(`- ⚡ สถานที่: ${msg.text.substring(0, 60)}`);
      }

      // Food / Lunch Reporting
      if (t.includes('อาหาร') || t.includes('ข้าว') || t.includes('ถาด') || t.includes('นม') || t.includes('หลอด')) {
        lunchStats.push(`- 🍱 ${msg.text.substring(0, 60)}`);
      }

      // Academic & Exams
      if (t.includes('ข้อสอบ') || t.includes('แนวข้อสอบ') || t.includes('สอบ') || t.includes('ปพ.')) {
        academic.push(`- 📖 ${msg.text.substring(0, 60)}`);
      }

      // Tasks
      if (t.includes('อย่าลืม') || t.includes('ให้ครู') || t.includes('ด่วน') || t.includes('ส่งที่')) {
        tasks.push(`- 📌 ${msg.text.substring(0, 60)}`);
      }
    });

    // Generate Formatted LINE Text
    const thaiDate = new Intl.DateTimeFormat('th-TH', { dateStyle: 'full' }).format(new Date());
    let lineFormattedText = `📢 [รายงานสรุปประเด็นโรงเรียน BPSchool]\n🗓 ${thaiDate}\n\n`;

    if (incidents.length > 0) {
      lineFormattedText += `🚨 1. ประเด็นด่วน & สุขอนามัย:\n${incidents.slice(0, 3).join('\n')}\n\n`;
    } else {
      lineFormattedText += `🚨 1. ประเด็นด่วน: สภาพแวดล้อมและสุขภาพนักเรียนปกติ\n\n`;
    }

    if (lunchStats.length > 0) {
      lineFormattedText += `🍱 2. ข้อมูลอาหารกลางวัน & นมโรงเรียน:\n${lunchStats.slice(0, 3).join('\n')}\n\n`;
    }

    if (academic.length > 0) {
      lineFormattedText += `📚 3. งานวิชาการ & การสอบ:\n${academic.slice(0, 3).join('\n')}\n\n`;
    }

    if (tasks.length > 0) {
      lineFormattedText += `📋 4. สิ่งที่ต้องติดตาม:\n${tasks.slice(0, 3).join('\n')}\n\n`;
    }

    lineFormattedText += `📊 ดูรายละเอียดทั้งหมดผ่าน Executive Dashboard: https://${req.headers.host || 'localhost:8080'}`;

    // Push to LINE if requested
    let pushResult = null;
    const targetId = process.env.LINE_TARGET_ID;
    if (shouldPush && targetId) {
      try {
        pushResult = await sendLinePushMessage(targetId, lineFormattedText);
        console.log(`[Push Success] Sent executive briefing to ${targetId}`);
      } catch (pushErr) {
        console.error('[Push Failed]:', pushErr.message);
        pushResult = { error: pushErr.message };
      }
    }

    // Return JSON
    return res.status(200).json({
      status: 'success',
      date: targetDate,
      messageCount: messages.length,
      summary: {
        incidentsCount: incidents.length,
        academicCount: academic.length,
        lunchCount: lunchStats.length,
        tasksCount: tasks.length,
        lineFormatted: lineFormattedText
      },
      pushResult
    });

  } catch (error) {
    console.error('[Summary API Error]:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
};
