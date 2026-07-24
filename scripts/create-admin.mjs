import {createClient} from '@supabase/supabase-js'
const url=process.env.NEXT_PUBLIC_SUPABASE_URL
const key=process.env.SUPABASE_SERVICE_ROLE_KEY
if(!url||!key)throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
const admin=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}})
const email='admin@mbc.internal',password=process.env.MBC_ADMIN_PASSWORD||'Toey1234'
const{data:list,error:listError}=await admin.auth.admin.listUsers({page:1,perPage:1000});if(listError)throw listError
const existing=list.users.find(u=>u.email?.toLowerCase()===email)
const metadata={username:'admin',full_name:'Admin MBC',role:'admin',must_change_password:true}
if(existing){const{error}=await admin.auth.admin.updateUserById(existing.id,{password,email_confirm:true,user_metadata:metadata});if(error)throw error;console.log('UPDATED admin',existing.id)}
else{const{data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:metadata});if(error)throw error;console.log('CREATED admin',data.user.id)}
console.log('Run in Supabase SQL Editor if this is the first admin:')
console.log("select public.promote_first_admin('admin@mbc.internal');")
