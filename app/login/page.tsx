'use client'
import {FormEvent,useState} from 'react'
import {useRouter} from 'next/navigation'
import {createClient} from '@/lib/supabase/client'

const AUTH_DOMAIN='mbc.internal'

export default function Login(){
 const[username,setUsername]=useState('admin')
 const[password,setPassword]=useState('Toey1234')
 const[error,setError]=useState('')
 const[busy,setBusy]=useState(false)
 const router=useRouter()
 async function submit(e:FormEvent){
  e.preventDefault();setBusy(true);setError('')
  const clean=username.trim().toLowerCase().replace(/\s+/g,'')
  const email=clean.includes('@')?clean:`${clean}@${AUTH_DOMAIN}`
  const {error}=await createClient().auth.signInWithPassword({email,password})
  if(error)setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
  else router.replace('/dashboard')
  setBusy(false)
 }
 return <div className="login-page"><form className="login-card stack" onSubmit={submit}>
  <div><h1>MBC Inventory</h1><div className="muted">ระบบตรวจนับสินค้าออนไลน์</div></div>
  {error&&<div className="error">{error}</div>}
  <div className="field"><label>ชื่อผู้ใช้</label><input value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" required/></div>
  <div className="field"><label>รหัสผ่าน</label><input value={password} onChange={e=>setPassword(e.target.value)} type="password" autoComplete="current-password" required/></div>
  <button className="btn primary" disabled={busy}>{busy?'กำลังเข้าสู่ระบบ...':'เข้าสู่ระบบ'}</button>
  <div className="muted" style={{fontSize:12}}>เข้าสู่ระบบด้วยชื่อผู้ใช้ ไม่ต้องพิมพ์ @mbc.local</div>
 </form></div>
}
