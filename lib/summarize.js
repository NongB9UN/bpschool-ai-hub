export function summarize(messages,date) {
 const categories=[['สุขภาพและความปลอดภัย',/ตัวร้อน|ป่วย|ไข้|แพ้ยา|ไม่สบาย|อุบัติเหตุ|ปลั๊ก|ไฟฟ้า/],['อาหารและนม',/อาหาร|ข้าว|ถาด|นม|หลอด/],['วิชาการ',/ข้อสอบ|สอบ|ปพ\.|วิชาการ/],['งานติดตาม',/อย่าลืม|ให้ครู|ด่วน|ส่งที่|กำหนด/]];
 let text=`รายงานประจำวันที่ ${date} (เวลาประเทศไทย)\nข้อความที่รับและยังไม่ถูกยกเลิก: ${messages.length} ข้อความ\nสรุปด้วยคำสำคัญ ยังไม่ได้ใช้ Gemini\n`;
 if (!messages.length) return text+'\nไม่มีข้อมูลที่รับเข้าระบบในวันที่เลือก ไม่สามารถสรุปสถานการณ์ได้';
 const matched=new Set();
 for (const [label,pattern] of categories) {
  const rows=messages.filter(m=>pattern.test(m.message_text)); rows.forEach(m=>matched.add(m.message_id));
  text+=`\n${label}:\n`+(rows.length?rows.slice(0,4).map(m=>`- ${m.message_text.replace(/\s+/g,' ').slice(0,140)}`).join('\n'):'ไม่พบคำสำคัญในข้อความที่รับเข้าระบบ');
  if(rows.length>4) text+=`\n(แสดง 4 จาก ${rows.length} รายการ)`;
  text+='\n';
 }
 const other=messages.filter(m=>!matched.has(m.message_id));
 if(other.length) text+='\nข้อความอื่น ๆ:\n'+other.slice(0,4).map(m=>`- ${m.message_text.replace(/\s+/g,' ').slice(0,140)}`).join('\n');
 return text+'\n\nโปรดตรวจสอบข้อความต้นทาง รายงานนี้ไม่ยืนยันว่าเหตุการณ์ทั้งหมดถูกรวบรวมครบ';
}
