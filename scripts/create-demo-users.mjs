import { createClient } from '@supabase/supabase-js'
const url=process.env.NEXT_PUBLIC_SUPABASE_URL
const key=process.env.SUPABASE_SERVICE_ROLE_KEY
if(!url||!key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
const admin=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}})
const AUTH_DOMAIN='mbc.internal'
const users=[
 ['admin','Toey1234','ผู้ดูแลระบบ','admin'],
 ['warehouse','1234','ผู้จัดการคลัง','warehouse_manager'],
 ['salesupport','1234','Sale Support','sale_support'],
 ['counter01','1234','Counter 01','counter'],
 ['counter02','1234','Counter 02','counter'],
 ['counter03','1234','Counter 03','counter'],
 ['counter04','1234','Counter 04','counter']
]
for(const [username,password,full_name,role] of users){
 const email=`${username}@${AUTH_DOMAIN}`
 const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{username,full_name,role,must_change_password:true}})
 if(error){console.log(username,'SKIP/ERROR',error.message);continue}
 console.log('CREATED',username,data.user.id)
}
