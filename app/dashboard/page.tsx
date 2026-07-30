'use client'

import { useEffect, useState } from 'react'
import Protected from '@/components/Protected'
import { createClient } from '@/lib/supabase/client'

type QuantityRow = { quantity: number | string | null }

export default function Dashboard() {
  const [kpi, setKpi] = useState({ rounds: 0, events: 0, qty: 0, unknown: 0 })

  useEffect(() => {
    const supabase = createClient()
    void Promise.all([
      supabase.from('count_rounds').select('*', { count: 'exact', head: true }),
      supabase.from('scan_events').select('*', { count: 'exact', head: true }),
      supabase.from('scan_totals').select('quantity'),
      supabase.from('unknown_barcodes').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    ]).then(([roundResult, eventResult, totalResult, unknownResult]) => {
      const quantities = (totalResult.data ?? []) as QuantityRow[]
      setKpi({
        rounds: roundResult.count ?? 0,
        events: eventResult.count ?? 0,
        qty: quantities.reduce((sum: number, row: QuantityRow) => sum + Number(row.quantity ?? 0), 0),
        unknown: unknownResult.count ?? 0,
      })
    })
  }, [])

  return (
    <Protected>
      <div className="topbar">
        <div>
          <div className="page-title">ภาพรวมระบบ</div>
          <div className="muted">ข้อมูลจาก Supabase แบบออนไลน์</div>
        </div>
      </div>
      <div className="grid cards">
        <div className="card"><div className="muted">รอบตรวจนับ</div><div className="kpi">{kpi.rounds}</div></div>
        <div className="card"><div className="muted">Scan Events</div><div className="kpi">{kpi.events}</div></div>
        <div className="card"><div className="muted">ยอดรวมที่นับ</div><div className="kpi">{kpi.qty}</div></div>
        <div className="card"><div className="muted">บาร์โค้ดไม่พบ</div><div className="kpi">{kpi.unknown}</div></div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h3>แนวทางใช้งาน</h3>
        <p>สร้างคลังและโลเคชั่น จากนั้นสร้างรอบตรวจนับ เปลี่ยนสถานะเป็น Active แล้วให้ผู้ตรวจนับเข้าสู่หน้า “ยิงบาร์โค้ด” ยอดจะรวมทันทีเมื่อฐานข้อมูลรับ Scan Event สำเร็จ</p>
      </div>
    </Protected>
  )
}
