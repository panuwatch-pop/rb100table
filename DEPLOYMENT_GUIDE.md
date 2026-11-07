# คู่มือการนำระบบขึ้น Cloud Host (ทำงาน 24 ชั่วโมง)

ระบบจองโต๊ะงานเลี้ยงรุ่นนี้ถูกสร้างและจัดเตรียมโครงสร้าง (Cloud-Ready) พร้อมสำหรับการนำขึ้น Cloud Host เรียบร้อยแล้ว โดยมีไฟล์สำคัญที่เตรียมไว้ให้แล้ว:
- `Dockerfile` (Node.js 22 + Next.js Standalone + Persistent SQLite)
- `docker-compose.yml` (รัน Docker บน VPS ได้ในคำสั่งเดียว)
- `render.yaml` (ตั้งค่า Blueprint สำหรับ Render.com)
- `D:\reunion-table-reservation-deploy.zip` (ไฟล์ ZIP รวมโค้ดทั้งหมด ขนาดเพียง ~0.22 MB พร้อมอัปโหลด)

---

## ตัวเลือกที่ 1: Render.com (แนะนำ - ง่ายที่สุดและมีระบบ Disk สำหรับ SQLite)

Render มีระบบ Web Service และ Persistent Disk ที่ช่วยให้ฐานข้อมูล SQLite ไม่สูญหายเมื่อรีสตาร์ต

### ขั้นตอนการติดตั้ง:
1. **เตรียม GitHub Repository:**
   - ไปที่ [github.com](https://github.com) แล้วสร้าง Repository ใหม่ (เช่น `reunion-table-reservation`)
   - แตกไฟล์ `D:\reunion-table-reservation-deploy.zip` แล้วอัปโหลดไฟล์ขึ้น GitHub (หรือใช้ Git Push)
2. **สร้าง Service บน Render:**
   - สมัคร/เข้าสู่ระบบที่ [render.com](https://render.com)
   - คลิกปุ่ม **New +** ที่มุมขวาบน -> เลือก **Web Service**
   - เลือก Repository `reunion-table-reservation` ที่เชื่อมต่อไว้
3. **กำหนดค่า (Configuration):**
   - **Name:** `reunion-reservation` (หรือชื่อตามต้องการ)
   - **Region:** Singapore (ใกล้ไทยที่สุด โหลดเร็ว)
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start`
4. **เพิ่ม Persistent Disk (สำคัญสำหรับ SQLite):**
   - เลื่อนลงไปที่หัวข้อ **Advanced** -> คลิก **Add Disk**
   - **Name:** `reunion-data`
   - **Mount Path:** `/var/data`
   - **Size:** `1 GB`
5. **เพิ่ม Environment Variable:**
   - `NODE_ENV` = `production`
   - `DATA_DIR` = `/var/data`
6. **กด "Deploy Web Service":**
   - รอระบบ Build ประมาณ 2-3 นาที จะได้รับลิงก์ HTTPS ประจำเว็บ เช่น:
     `https://reunion-reservation.onrender.com`
   - สามารถนำลิงก์นี้ไปส่งให้เพื่อนๆ และคณะกรรมการเข้าจองได้ตลอด 24 ชั่วโมง โดยไม่ต้องเปิดคอมพิวเตอร์ทิ้งไว้

---

## ตัวเลือกที่ 2: Railway.app (เร็วมากและรองรับ Volume)

1. สมัคร/เข้าสู่ระบบที่ [railway.app](https://railway.app)
2. คลิก **+ New Project** -> เลือก **Deploy from GitHub repo**
3. เลือก Repository ที่เตรียมไว้
4. ไปที่เมนู **Settings** ของ Service บน Railway:
   - ที่หัวข้อ **Volumes** -> คลิก **Add Volume**
   - กำหนด Mount Path: `/app/data`
5. ในเมนู **Networking** -> คลิก **Generate Domain** เพื่อรับลิงก์ HTTPS สาธารณะ (เช่น `https://reunion.up.railway.app`)
6. ระบบจะเริ่มทำงานทันที 24 ชม.

---

## ตัวเลือกที่ 3: เครื่องเซิร์ฟเวอร์ VPS ส่วนตัว (Ubuntu / Debian / Docker)

หากท่านมีเซิร์ฟเวอร์ VPS (เช่น DigitalOcean, Hetzner, AWS, หรือ VPS ในไทย):
1. อัปโหลดไฟล์โค้ดหรือแตกไฟล์ `reunion-table-reservation-deploy.zip` ไปไว้ที่เครื่องเซิร์ฟเวอร์
2. รันคำสั่งเดียวผ่าน Terminal:
   ```bash
   docker compose up -d --build
   ```
3. เว็บจะเริ่มทำงานทันทีที่พอร์ต `3000` (สามารถผูก Nginx Reverse Proxy และ Let's Encrypt SSL Domain ต่อได้ทันที)
