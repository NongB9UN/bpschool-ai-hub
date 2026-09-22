# 🏫 BPSchool AI Executive Hub (ระบบ AI สรุปงานและแดชบอร์ดโรงเรียนสำหรับผู้บริหาร)

ระบบ AI สำหรับช่วยฝ่ายบริหารและผู้อำนวยการโรงเรียน สรุปประเด็นสำคัญประจำวันจากกลุ่ม LINE แชท พร้อมระบบวิเคราะห์ความปลอดภัย สุขอนามัย อาหารกลางวัน และงานวิชาการ

---

## 📂 โครงสร้างโปรเจกต์

```
D:\ProjectAI\school-executive-dashboard\
├── index.html            # หน้าเว็บหลัก Executive Dashboard
├── vercel.json           # การตั้งค่า Serverless & Cron Job (ส่งสรุป 16:30 น.)
├── package.json          # ข้อมูลโปรเจกต์
├── .env.example          # ตัวอย่างการตั้งค่า Environment Variables
├── css/
│   ├── style.css         # Design System, Theme สี, Layout
│   └── components.css    # สไตล์การ์ด Glassmorphism, Badges, Tables, Modal
├── js/
│   ├── app.js            # Controller หลัก ควบคุมการทำงานของ Dashboard
│   ├── chatParser.js     # เครื่องมือวิเคราะห์แชท LINE (NLP & Regex)
│   ├── sampleData.js     # ข้อมูลตัวอย่างสถานการณ์จริง
│   └── exporter.js       # ระบบคัดลอกข้อความและส่งออกรายงาน
└── api/
    ├── webhook.js        # Serverless Endpoint รับข้อความจาก LINE (Silent Mode)
    ├── summary.js        # Endpoint ประมวลผลสรุปงานประจำวัน
    └── push-line.js      # Helper ส่งข้อความแจ้งเตือนหา ผอ. / กลุ่มทดสอบ
```

---

## ⚙️ การตั้งค่า Environment Variables บน Vercel

เมื่อนำขึ้น Vercel ให้กำหนดค่า Environment Variables ดังนี้:

| ตัวแปร (Variable) | รายละเอียด | แหล่งที่มา |
| :--- | :--- | :--- |
| `LINE_CHANNEL_SECRET` | รหัสลับของ Channel | LINE Developers Console > Basic settings |
| `LINE_CHANNEL_ACCESS_TOKEN` | Token สำหรับส่งข้อความ | LINE Developers Console > Messaging API |
| `LINE_TARGET_ID` | ID ของผู้รับ (User ID หรือ Group ID) | LINE Developers / ห้องทดสอบ |
| `GEMINI_API_KEY` | คีย์สำหรับเรียกใช้งาน Gemini AI | Google AI Studio |

---

## 🚀 การสั่งรันในเครื่อง (Local Testing)

```bash
# รัน Web Server ด้วย Python
python -m http.server 8080
```
เปิดเบราว์เซอร์ไปที่: `http://localhost:8080`
