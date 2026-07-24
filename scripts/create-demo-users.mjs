import { createClient } from '@supabase/supabase-js'
const url=process.env.NEXT_PUBLIC_SUPABASE_URL
const key=process.env.SUPABASE_SERVICE_ROLE_KEY
if(!url||!key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
const admin=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}})
const AUTH_DOMAIN='mbc.internal'
const users=[
 ['admin','Toey1234','ผู้ดูแลระบบ','admin'],
 ['warehouse','MBC@1234','ผู้จัดการคลัง','warehouse_manager'],
 ['salesupport','MBC@1234','Sale Support','sale_support'],
 ['counter01','MBC@1234','Counter 01','counter'],
 ['counter02','MBC@1234','Counter 02','counter'],
 ['counter03','MBC@1234','Counter 03','counter'],
 ['counter04','MBC@1234','Counter 04','counter']
]

const {data:listData,error:listError}=await admin.auth.admin.listUsers({page:1,perPage:1000})
if(listError) throw listError
const existingByEmail=new Map((listData.users||[]).map(u=>[u.email?.toLowerCase(),u]))

for(const [username,password,full_name,role] of users){
 const email=`${username}@${AUTH_DOMAIN}`
 const metadata={username,full_name,role,must_change_password:true}
 const existing=existingByEmail.get(email)
 if(existing){
  const {error}=await admin.auth.admin.updateUserById(existing.id,{password,email_confirm:true,user_metadata:metadata})
  if(error){console.log(username,'UPDATE ERROR',error.message);continue}
  console.log('UPDATED',username,existing.id)
  continue
 }
 const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:metadata})
 if(error){console.log(username,'CREATE ERROR',error.message);continue}
 console.log('CREATED',username,data.user.id)
}
console.log('\nLogin shown to users:')
console.log('admin / Toey1234')
console.log('warehouse, salesupport, counter01-counter04 / 1234')
