import { createClient } from '@supabase/supabase-js'
const url=process.env.NEXT_PUBLIC_SUPABASE_URL
const publishable=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
const service=process.env.SUPABASE_SERVICE_ROLE_KEY
if(!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
if(!publishable) throw new Error('Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
if(!service) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
console.log('Supabase URL:',url)
const admin=createClient(url,service,{auth:{autoRefreshToken:false,persistSession:false}})
const {data,error}=await admin.auth.admin.listUsers({page:1,perPage:1000})
if(error) throw error
const expected=['admin','warehouse','salesupport','counter01','counter02','counter03','counter04']
for(const username of expected){
 const email=`${username}@mbc.internal`
 const user=data.users.find(u=>u.email?.toLowerCase()===email)
 console.log(user?'OK':'MISSING',username,user?.id||'')
}
