import {createClient} from '@supabase/supabase-js'
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,publishable=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,service=process.env.SUPABASE_SERVICE_ROLE_KEY
if(!url)throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');if(!publishable)throw new Error('Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');if(!service)throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
console.log('Supabase URL:',url)
const admin=createClient(url,service,{auth:{autoRefreshToken:false,persistSession:false}})
const{data,error}=await admin.auth.admin.listUsers({page:1,perPage:1000});if(error)throw error
const user=data.users.find(u=>u.email?.toLowerCase()==='admin@mbc.internal');console.log(user?'OK admin':'MISSING admin',user?.id||'')
const{data:tables,error:dbError}=await admin.from('app_settings').select('key').limit(1)
console.log(dbError?'MIGRATION 004 MISSING/ERROR':'MIGRATION 004 OK',dbError?.message||tables?.length||0)
