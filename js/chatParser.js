/**
 * Chat Parser & Intelligent School Context Engine
 * Parses raw LINE chat export files and categorizes messages for Executive Dashboard
 */

class SchoolChatParser {
  constructor() {
    this.dateHeaderRegex = /^(\d{4}\.\d{2}\.\d{2})\s+([A-Za-z]+)/m;
    this.messageRegex = /^(\d{2}:\d{2})\s+([^\n\r]+?)\s+([\s\S]*?)(?=\n\d{2}:\d{2}|$)/gm;
  }

  /**
   * Parse full chat text into structured days
   */
  parseFullChat(rawText) {
    const days = {};
    const lines = rawText.split('\n');
    let currentDate = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Check for Date Header like 2026.09.01 Tuesday
      const dateMatch = line.match(/^(\d{4})\.(\d{2})\.(\d{2})\s+([A-Za-z]+)/);
      if (dateMatch) {
        const [_, year, month, day, dayOfWeek] = dateMatch;
        currentDate = `${year}-${month}-${day}`;
        if (!days[currentDate]) {
          days[currentDate] = {
            dateKey: currentDate,
            dayOfWeek: dayOfWeek,
            messages: []
          };
        }
        continue;
      }

      // Check for Message line like 08:20 🐷Popeye🐷(ครูป๊อป) ครู ลงสถิติ ให้ด้วยค่ะ @All
      const msgMatch = line.match(/^(\d{2}:\d{2})\s+([^\s]+(?:\s+[^\s]+)?)\s+(.*)$/);
      if (msgMatch && currentDate) {
        const [_, time, sender, content] = msgMatch;
        days[currentDate].messages.push({
          time,
          sender: sender.trim(),
          content: content.trim()
        });
      } else if (currentDate && days[currentDate].messages.length > 0) {
        // Multi-line continuation
        const lastMsg = days[currentDate].messages[days[currentDate].messages.length - 1];
        lastMsg.content += '\n' + line;
      }
    }

    // Process each day with AI/NLP logic
    const analyzedDays = {};
    for (const [dateKey, dayData] of Object.entries(days)) {
      analyzedDays[dateKey] = this.analyzeDay(dayData);
    }

    return analyzedDays;
  }

  /**
   * Analyze messages of a single day
   */
  analyzeDay(dayData) {
    const messages = dayData.messages;
    const incidents = [];
    const academic = [];
    const tasks = [];
    const healthAlerts = [];
    let statsMentionCount = 0;
    const senders = new Set();

    messages.forEach((msg, idx) => {
      senders.add(msg.sender);
      const text = msg.content.toLowerCase();

      // 1. Health & Safety Analysis
      if (text.includes('ตัวร้อน') || text.includes('ป่วย') || text.includes('ไข้หวัด') || 
          text.includes('แพ้ยา') || text.includes('ยาฆ่าเชื้อ') || text.includes('เย็บ') || 
          text.includes('ไม่สบาย') || text.includes('รพ.') || text.includes('แอดมิด')) {
        incidents.push({
          id: `inc-auto-${idx}`,
          type: 'danger',
          title: 'เฝ้าระวังสุขภาพ / นักเรียนหรือครูป่วย',
          desc: msg.content,
          reporter: msg.sender,
          time: msg.time,
          badge: 'สุขภาพ/ด่วน'
        });
        healthAlerts.push(msg.content);
      } else if (text.includes('กลับบ้าน') || text.includes('ผปค') || text.includes('ผู้ปกครองมารับ') || text.includes('รับกลับ')) {
        incidents.push({
          id: `inc-auto-${idx}`,
          type: 'info',
          title: 'แจ้งผู้ปกครองรับนักเรียน',
          desc: msg.content,
          reporter: msg.sender,
          time: msg.time,
          badge: 'ธุรการนักเรียน'
        });
      } else if (text.includes('ปลั๊ก') || text.includes('ลืมปิด') || text.includes('ไฟ') || text.includes('กรรไกร') || text.includes('ขวางทาง')) {
        incidents.push({
          id: `inc-auto-${idx}`,
          type: 'warning',
          title: 'ความปลอดภัยและสถานที่',
          desc: msg.content,
          reporter: msg.sender,
          time: msg.time,
          badge: 'อาคารสถานที่'
        });
      }

      // 2. Academic & Exam Analysis
      if (text.includes('แนวข้อสอบ') || text.includes('ข้อสอบ') || text.includes('สอบ') || 
          text.includes('แผนการสอน') || text.includes('3is') || text.includes('7 habits') || 
          text.includes('ปพ.') || text.includes('สมุดพก') || text.includes('ตรวจ')) {
        
        // Extract Subject / Details
        academic.push({
          subject: this.extractSubjectTitle(msg.content),
          grade: this.extractGrade(msg.content),
          status: text.includes('ตรวจไม่เสร็จ') || text.includes('อย่าเพิ่ง') ? 'กำลังตรวจ (ห้ามหยิบ)' : 'ส่งแล้ว / ประกาศ',
          reviewer: msg.sender,
          details: msg.content.substring(0, 160) + (msg.content.length > 160 ? '...' : '')
        });
      }

      // 3. Task & Action Item Tracking
      if (text.includes('อย่าลืม') || text.includes('ให้ครู') || text.includes('รบกวน') || 
          text.includes('ภายใน') || text.includes('ด่วน') || text.includes('ส่งที่') || text.includes('มารับ')) {
        tasks.push({
          task: msg.content.split('\n')[0].substring(0, 100),
          assignee: msg.sender.includes('พี่ฝนภา') || msg.sender.includes('พลอย') || msg.sender.includes('บี') ? 'คุณครูทุกคน / ผู้เกี่ยวข้อง' : msg.sender,
          deadline: this.extractDeadline(msg.content),
          status: 'In Progress'
        });
      }

      // 4. Statistics Tracking
      if (text.includes('สถิติ') || text.includes('ลงสถิติ')) {
        statsMentionCount++;
      }
    });

    // Generate Executive Summary
    const briefing = this.generateExecutiveBriefing(dayData.dateKey, incidents, academic, tasks, healthAlerts);

    // Format Date Display
    const dateObj = new Date(dayData.dateKey);
    const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const dateDisplay = `วันที่ ${dateObj.getDate()} ${thaiMonths[dateObj.getMonth()]} ${dateObj.getFullYear() + 543}`;

    return {
      dateDisplay,
      kpi: {
        urgentCount: incidents.filter(i => i.type === 'danger').length,
        academicCount: academic.length,
        operationsCount: incidents.filter(i => i.type === 'warning' || i.type === 'info').length,
        activeTeachers: senders.size,
        attendanceStatus: statsMentionCount > 0 ? "กำชับส่งยอดแล้ว" : "ปกติ"
      },
      executiveBriefing: briefing,
      incidents,
      academic,
      tasks: tasks.slice(0, 6), // Top 6 tasks
      lineFormatted: this.generateLineFormat(dateDisplay, briefing, incidents, academic, tasks)
    };
  }

  extractSubjectTitle(content) {
    if (content.includes('ดนตรีสากล')) return 'วิชาดนตรีสากล';
    if (content.includes('ดนตรี')) return 'วิชาดนตรี';
    if (content.includes('คณิต')) return 'วิชาคณิตศาสตร์';
    if (content.includes('ภาษาอังกฤษ')) return 'วิชาภาษาอังกฤษ';
    if (content.includes('วิทยาศาสตร์') || content.includes('วิทย์')) return 'วิชาวิทยาศาสตร์';
    if (content.includes('ภาษาไทย')) return 'วิชาภาษาไทย';
    if (content.includes('สังคม')) return 'วิชาสังคมศึกษา';
    if (content.includes('สุขศึกษา') || content.includes('พลศึกษา')) return 'สุขศึกษา & พลศึกษา';
    if (content.includes('จีน')) return 'วิชาภาษาจีน';
    if (content.includes('ตรวจ')) return 'การตรวจแนวข้อสอบ / แผนงาน';
    return 'งานวิชาการและแนวข้อสอบ';
  }

  extractGrade(content) {
    const match = content.match(/ป\.\s*(\d(?:\/\d)?(?:\s*-\s*\d(?:\/\d)?)?)/);
    if (match) return `ชั้น ป.${match[1]}`;
    if (content.includes('ทุกชั้น') || content.includes('ทุกห้อง')) return 'ทุกระดับชั้น';
    return 'ระดับประถมศึกษา';
  }

  extractDeadline(content) {
    if (content.includes('ด่วน')) return 'ด่วนที่สุด';
    if (content.includes('ตอนนี้')) return 'ทันที';
    if (content.includes('ก่อน')) {
      const match = content.match(/ก่อน\s*([\d:.]+)/);
      if (match) return `ก่อน ${match[1]}`;
    }
    return 'ประจำวัน';
  }

  generateExecutiveBriefing(dateKey, incidents, academic, tasks, healthAlerts) {
    const parts = [];
    if (healthAlerts.length > 0) {
      parts.push(`มีการเฝ้าระวังด้านสุขภาพ (${healthAlerts.length} เคส) อาทิ การติดตามอาการไข้หวัด/ยาของนักเรียน`);
    }
    if (academic.length > 0) {
      parts.push(`งานวิชาการมีความคืบหน้า ${academic.length} รายการ โดยเฉพาะการตรวจและส่งแนวข้อสอบกลางภาค`);
    }
    if (tasks.length > 0) {
      parts.push(`มีการประสานงานและติดตามภารกิจเร่งด่วน ${tasks.length} ประเด็น`);
    }
    if (parts.length === 0) {
      return "การดำเนินงานภายในโรงเรียนเป็นไปด้วยความเรียบร้อย ไม่มีข้อตรวจพบเร่งด่วน";
    }
    return parts.join(' และ ') + ' โดยฝ่ายบริหารสามารถติดตามรายละเอียดแต่ละส่วนได้จาก Dashboard นี้';
  }

  generateLineFormat(dateDisplay, briefing, incidents, academic, tasks) {
    let text = `📢 [รายงานสรุปประเด็นโรงเรียนสำหรับผู้บริหาร]\n🗓 ${dateDisplay}\n\n`;
    
    if (incidents.length > 0) {
      text += `🚨 1. ประเด็นด่วน & สุขอนามัย:\n`;
      incidents.slice(0, 3).forEach(inc => {
        text += `- ${inc.title}: ${inc.desc.substring(0, 80)}...\n`;
      });
      text += `\n`;
    }

    if (academic.length > 0) {
      text += `📚 2. งานวิชาการ & ข้อสอบ:\n`;
      academic.slice(0, 3).forEach(ac => {
        text += `- ${ac.subject} (${ac.grade}): ${ac.status}\n`;
      });
      text += `\n`;
    }

    if (tasks.length > 0) {
      text += `📋 3. งานติดตาม & ผู้รับผิดชอบ:\n`;
      tasks.slice(0, 3).forEach(t => {
        text += `- ${t.task} (ผู้รับผิดชอบ: ${t.assignee})\n`;
      });
    }

    return text.trim();
  }
}

// Export instance
window.schoolChatParser = new SchoolChatParser();
