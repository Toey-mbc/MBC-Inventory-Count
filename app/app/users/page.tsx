'use client'
import {useEffect,useState} from 'react'
import Protected from '@/components/Protected'
import {createClient} from '@/lib/supabase/client'
export default function Users(){const[rows,setRows]=useState<any[]>([]);useEffect(()=>{createClient().from('profiles').select('*').order('email').then(({data})=>setRows(data||[]))},[]);return <Protected><div className="topbar"><div><div className="page-title">ผู้ใช้งานและสิทธิ์</div><div className="muted">Sale Support มีสิทธิ์ระดับเดียวกับ Warehouse Manager</div></div></div><div className="card"><div className="notice">การสร้างบัญชี Auth ใช้สคริปต์ seed หรือ Supabase Dashboard ส่วนการเปลี่ยน Role ทำในตาราง profiles โดย Admin</div><table className="table"><thead><tr><th>ชื่อ</th><th>อีเมล</th><th>Role</th><th>สถานะ</th></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td>{x.full_name}</td><td>{x.email}</td><td><span className="badge">{x.role}</span></td><td>{x.active?'ใช้งาน':'ปิด'}</td></tr>)}</tbody></table></div></Protected>}
