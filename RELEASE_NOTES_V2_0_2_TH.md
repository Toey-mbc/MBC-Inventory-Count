# Release Notes 2.0.2

- แก้ Error `profiles.access_mode does not exist`
- เปลี่ยนระบบสิทธิ์ให้ใช้ `profiles.role` เดิมโดยตรง
- Admin เลือกสิทธิ์อ่าน/แก้ไขได้จากหน้าเว็บเหมือนเดิม
- ไม่บังคับเปลี่ยนรหัสผ่าน
- เพิ่ม SQL ซ่อมฐานข้อมูลเดิมที่รันซ้ำได้
- เพิ่ม Production Check ป้องกันโค้ดกลับไปอ้างคอลัมน์ access_mode อีก
