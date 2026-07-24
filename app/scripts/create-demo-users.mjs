import { createClient } from '@supabase/supabase-js'
const url=process.env.NEXT_PUBLIC_SUPABASE_URL
const key=process.env.SUPABASE_SERVICE_ROLE_KEY
if(!url||!key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
const admin=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}})
const users=[
 ['admin@mbc.local','Admin@2026','ผู้ดูแลระบบ','admin'],
 ['warehouse@mbc.local','Ware@2026','ผู้จัดการคลัง','warehouse_manager'],
 ['salesupport@mbc.local','Sale@2026','Sale Support','sale_support'],
 ['counter01@mbc.local','Count@2026','Counter 01','counter'],
 ['counter02@mbc.local','Count@2026','Counter 02','counter'],
 ['counter03@mbc.local','Count@2026','Counter 03','counter'],
 ['counter04@mbc.local','Count@2026','Counter 04','counter']
]
for(const [email,password,full_name,role] of users){
 const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name,role,must_change_password:true}})
 if(error){console.log(email,'SKIP/ERROR',error.message);continue}
 console.log('CREATED',email,data.user.id)
}
