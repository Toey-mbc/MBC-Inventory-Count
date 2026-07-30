# Build Fix V1.5.2

แก้จาก Build Log ในคลิป Vercel:

- `Module not found: Can't resolve 'qrcode.react'`
- `Module not found: Can't resolve 'xlsx'`

เพิ่ม dependencies ใน `package.json`:

- `qrcode.react` เวอร์ชัน `^4.2.0`
- `xlsx` เวอร์ชัน `^0.18.5`

ให้อัปโหลดไฟล์ชุดนี้ทับ Repository เดิมทั้งหมด แล้ว Commit/Push ใหม่ หรืออย่างน้อยนำ `package.json` ไปวางทับไฟล์เดิม จากนั้น Redeploy โดยไม่ใช้ Build Cache
