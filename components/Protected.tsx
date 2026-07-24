'use client'
import { useEffect,useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AppShell from './AppShell'
export default function Protected({children}:{children:React.ReactNode}){
 const [ready,setReady]=useState(false); const router=useRouter()
 useEffect(()=>{const supabase=createClient();supabase.auth.getUser().then(({data})=>{if(!data.user)router.replace('/login');else setReady(true)})},[router])
 if(!ready)return <div style={{padding:30}}>กำลังตรวจสอบสิทธิ์...</div>
 return <AppShell>{children}</AppShell>
}
