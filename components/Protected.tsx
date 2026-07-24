'use client'
import {useEffect} from 'react'
import {useRouter} from 'next/navigation'
import AppShell from './AppShell'
import {useProfile} from '@/lib/useProfile'

export default function Protected({children}:{children:React.ReactNode}){
 const{profile,loading,error}=useProfile();const router=useRouter()
 useEffect(()=>{if(!loading&&!profile)router.replace('/login')},[loading,profile,router])
 if(loading)return <div className="center-screen"><div className="loader"/><div>กำลังตรวจสอบสิทธิ์...</div></div>
 if(error)return <div className="center-screen"><div className="error-box">ตรวจสอบสิทธิ์ไม่สำเร็จ: {error}</div></div>
 if(!profile)return null
 if(!profile.active)return <div className="center-screen"><div className="error-box">บัญชีนี้ถูกระงับ กรุณาติดต่อผู้ดูแลระบบ</div></div>
 return <AppShell profile={profile}>{children}</AppShell>
}
