'use client'
import {FormEvent,useMemo,useState} from 'react'
import {useRouter} from 'next/navigation'
import {createClient} from '@/lib/supabase/client'

const AUTH_DOMAIN='mbc.internal'
const UAT_PASSWORD_ALIAS='1234'
const UAT_AUTH_PASSWORD='MBC@1234'

export default function Login(){
 const[username,setUsername]=useState('admin')
 const[password,setPassword]=useState('Toey1234')
 const[showPassword,setShowPassword]=useState(false)
 const[error,setError]=useState('')
 const[busy,setBusy]=useState(false)
 const router=useRouter()
 const configured=useMemo(()=>Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),[])

 async function submit(e:FormEvent){
  e.preventDefault();setBusy(true);setError('')
  if(!configured){setError('ยังไม่ได้ตั้งค่า Supabase Environment Variables ใน Vercel');setBusy(false);return}
  const clean=username.trim().toLowerCase().replace(/\s+/g,'')
  if(!clean){setError('กรุณากรอกชื่อผู้ใช้');setBusy(false);return}
  const email=clean.includes('@')?clean:`${clean}@${AUTH_DOMAIN}`
  // Supabase hosted projects require a longer password. During UAT, users still type 1234;
  // the app maps it to the longer internal password created by the seed script.
  const authPassword=password===UAT_PASSWORD_ALIAS?UAT_AUTH_PASSWORD:password
  try{
   const {error}=await createClient().auth.signInWithPassword({email,password:authPassword})
   if(error){
    console.error('Login failed:',error.message)
    setError('เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบ Username, Password และสิทธิ์ Admin ใน Supabase')
   }else{
    router.replace('/workspace')
    router.refresh()
   }
  }catch(err){
   console.error(err)
   setError('เชื่อมต่อ Supabase ไม่สำเร็จ กรุณาตรวจสอบ URL และ Publishable Key')
  }finally{setBusy(false)}
 }

 return <div className="login-page"><form className="login-card stack" onSubmit={submit}>
  <div className="login-heading"><div className="login-mark">MBC</div><div><h1>Inventory Count</h1><div className="muted">ระบบตรวจนับสินค้าออนไลน์</div></div></div>
  {error&&<div className="error">{error}</div>}
  <div className="field"><label>ชื่อผู้ใช้</label><input value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" placeholder="เช่น admin หรือ counter01" required/></div>
  <div className="field"><label>รหัสผ่าน</label><div className="password-wrap"><input value={password} onChange={e=>setPassword(e.target.value)} type={showPassword?'text':'password'} autoComplete="current-password" required/><button type="button" className="password-toggle" onClick={()=>setShowPassword(v=>!v)}>{showPassword?'ซ่อน':'แสดง'}</button></div></div>
  <button className="btn primary login-button" disabled={busy}>{busy?'กำลังเข้าสู่ระบบ...':'เข้าสู่ระบบ'}</button>
  <div className="login-help">กรอกเฉพาะชื่อผู้ใช้ ไม่ต้องใส่โดเมนหรืออีเมล</div>
 </form></div>
}
