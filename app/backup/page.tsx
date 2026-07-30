'use client'
import Protected from '@/components/Protected';import ModulePlaceholder from '@/components/ModulePlaceholder'
export default function Page(){return <Protected><ModulePlaceholder title="Backup / Restore" description="ตรวจสุขภาพ สำรองข้อมูล และล้างข้อมูลทดสอบ"><div className="card"><div className="notice"><b>Production Safety</b><div>ฟังก์ชันล้างข้อมูลจะต้องตรวจสิทธิ์ Admin และยืนยันซ้ำก่อนทำงานจริง</div></div></div></ModulePlaceholder></Protected>}
